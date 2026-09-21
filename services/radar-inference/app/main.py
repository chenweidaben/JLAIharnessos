# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""FastAPI application for the DAMO-RADAR abdominal CT inference service.

Endpoints (contract section 3):
  * GET  /health/live
  * GET  /health/ready
  * GET  /api/v1/radar/catalog
  * POST /api/v1/radar/jobs
  * GET  /api/v1/radar/jobs/{job_id}
"""
from __future__ import annotations

import logging

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

from . import production_engine
from .auth import require_internal
from .catalog import build_catalog
from .config import settings
from .contract import (
    CatalogResponse,
    HealthLive,
    HealthReady,
    JobAccepted,
    JobCreateRequest,
    JobStatusResponse,
    Mode,
    Source,
)
from .jobs import manager
from .logging_redact import sanitize_error_message, setup_logging

setup_logging()
log = logging.getLogger("radar.api")

app = FastAPI(
    title="DAMO-RADAR Inference Service",
    version="0.1.0",
    description="Second-reader abdominal CT findings. Not a standalone diagnosis device.",
)


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    """Never leak stack traces / paths to callers."""
    log.exception("unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"code": "internal_error", "message": sanitize_error_message(exc)},
    )


# ---------------------------------------------------------------------------
# Health (unauthenticated, for probes)
# ---------------------------------------------------------------------------
@app.get("/health/live", response_model=HealthLive)
async def health_live() -> HealthLive:
    return HealthLive(status="ok")


@app.get("/health/ready", response_model=HealthReady)
async def health_ready() -> HealthReady:
    mode = production_engine.resolve_mode()
    is_production = mode == Mode.production.value
    return HealthReady(
        status="ready" if is_production else "degraded",
        mode=mode,
        weights_loaded=production_engine.weights_loaded(),
        gpu_available=production_engine.gpu_available(),
        model=settings.model,
        model_version=settings.model_version,
    )


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------
@app.get(
    "/api/v1/radar/catalog",
    response_model=CatalogResponse,
    dependencies=[Depends(require_internal)],
)
async def get_catalog() -> CatalogResponse:
    return build_catalog()


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------
@app.post(
    "/api/v1/radar/jobs",
    response_model=JobAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_internal)],
)
async def create_job(body: JobCreateRequest) -> JobAccepted:
    accepted = manager.create(
        study_uid=body.study_uid,
        source=body.source,
        file_ref=body.file_ref,
    )
    return accepted


@app.get(
    "/api/v1/radar/jobs/{job_id}",
    response_model=JobStatusResponse,
    dependencies=[Depends(require_internal)],
)
async def get_job(job_id: str) -> JobStatusResponse:
    job = manager.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job not found")
    return job


@app.on_event("startup")
async def _startup() -> None:
    mode = production_engine.resolve_mode()
    log.info(
        "RADAR service starting port=%d mode=%s weights=%s gpu=%s",
        settings.port, mode,
        production_engine.weights_available(),
        production_engine.gpu_available(),
    )
    if mode != Mode.production.value:
        log.warning(
            "running in DEMO (degraded) mode: real weights not available; "
            "demo results are pre-computed and deterministic. "
            "Weights (CC BY-NC-SA 4.0) must be downloaded out-of-band."
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port)
