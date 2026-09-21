# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""In-memory job queue with bounded concurrency and timeout handling."""
from __future__ import annotations

import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional

from .auth import settings  # reuse same settings object
from .contract import (
    JobAccepted,
    JobError,
    JobStatus,
    JobStatusResponse,
    Mode,
    RadarResult,
    Source,
)
from .logging_redact import safe_ref
from . import production_engine

log = logging.getLogger("radar.jobs")


def run_inference(study_uid: str, file_ref: Optional[str], mode: str) -> RadarResult:
    """Thin indirection so tests can observe / stub concurrent execution."""
    return production_engine.run(study_uid, file_ref)


class JobManager:
    def __init__(self) -> None:
        self._jobs: Dict[str, dict] = {}
        self._lock = threading.RLock()
        self._sem = threading.Semaphore(settings.max_concurrency)
        # Sized to allow dispatch queues; the semaphore bounds real concurrency.
        self._executor = ThreadPoolExecutor(max_workers=max(4, settings.max_concurrency * 2))
        self._active = 0
        self._max_active = 0

    # ------------------------------------------------------------------
    def reset(self) -> None:
        with self._lock:
            self._jobs.clear()
            self._sem = threading.Semaphore(settings.max_concurrency)
            self._active = 0
            self._max_active = 0

    @property
    def max_observed_concurrency(self) -> int:
        with self._lock:
            return self._max_active

    # ------------------------------------------------------------------
    def create(self, study_uid: str, source: Source, file_ref: Optional[str]) -> JobAccepted:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        effective_mode = production_engine.resolve_mode()
        now = time.time()
        job = {
            "job_id": job_id,
            "status": JobStatus.queued.value,
            "progress": 0.0,
            "mode": effective_mode,
            "study_uid": study_uid,
            "error": None,
            "result": None,
            "file_ref": file_ref,
            "created_at": now,
            "updated_at": now,
        }
        with self._lock:
            self._jobs[job_id] = job

        log.info(
            "job created id=%s source=%s mode=%s ref=%s",
            job_id, source.value, effective_mode, safe_ref(file_ref),
        )

        # Demo source OR degraded demo mode: complete synchronously (contract 3.4).
        if source == Source.demo or effective_mode == Mode.demo.value:
            self._execute(job_id)
        else:
            self._executor.submit(self._execute, job_id)

        snap = self._snapshot(job_id)
        return JobAccepted(job_id=snap["job_id"], status=snap["status"], mode=snap["mode"])

    # ------------------------------------------------------------------
    def _execute(self, job_id: str) -> None:
        job = self._jobs.get(job_id)
        if job is None:
            return
        with self._lock:
            job["status"] = JobStatus.running.value
            job["progress"] = 0.2
            job["updated_at"] = time.time()

        acquired = self._sem.acquire(timeout=settings.job_timeout_seconds)
        if not acquired:
            with self._lock:
                job["status"] = JobStatus.failed.value
                job["progress"] = 1.0
                job["error"] = JobError(code="timeout", message="job queued beyond timeout").model_dump()
            return

        try:
            with self._lock:
                self._active += 1
                self._max_active = max(self._max_active, self._active)
            result = run_inference(job["study_uid"], job["file_ref"], job["mode"])
            with self._lock:
                job["result"] = result.model_dump()
                job["status"] = JobStatus.completed.value
                job["progress"] = 1.0
                job["updated_at"] = time.time()
            log.info("job completed id=%s", job_id)
        except Exception as exc:  # noqa: BLE001
            log.exception("job failed id=%s", job_id)
            with self._lock:
                job["status"] = JobStatus.failed.value
                job["progress"] = 1.0
                # Never expose stack traces or paths in the error body.
                job["error"] = JobError(code="inference_failed", message="inference failed").model_dump()
        finally:
            with self._lock:
                self._active = max(0, self._active - 1)
            self._sem.release()

    # ------------------------------------------------------------------
    def _reap_timeout(self, job: dict) -> None:
        age = time.time() - job["created_at"]
        if job["status"] in (JobStatus.running.value, JobStatus.queued.value):
            if age > settings.job_timeout_seconds:
                job["status"] = JobStatus.failed.value
                job["progress"] = 1.0
                job["error"] = JobError(code="timeout", message="job timed out").model_dump()
                job["updated_at"] = time.time()

    def _snapshot(self, job_id: str) -> dict:
        job = self._jobs[job_id]
        self._reap_timeout(job)
        return job

    def get(self, job_id: str) -> Optional[JobStatusResponse]:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            self._reap_timeout(job)
            err = JobError(**job["error"]) if job["error"] else None
            result = RadarResult(**job["result"]) if job["result"] else None
            return JobStatusResponse(
                job_id=job["job_id"],
                status=job["status"],
                progress=job["progress"],
                mode=job["mode"],
                study_uid=job["study_uid"],
                error=err,
                result=result,
            )


manager = JobManager()
