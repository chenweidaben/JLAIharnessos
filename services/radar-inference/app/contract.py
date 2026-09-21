# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Pydantic models strictly aligned to docs/RADAR_FUSION_CONTRACT.md.

Do NOT add or rename fields here without updating the contract document.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums (contract section 2 & 3)
# ---------------------------------------------------------------------------
class Source(str, Enum):
    pacs = "pacs"
    upload = "upload"
    demo = "demo"


class Mode(str, Enum):
    demo = "demo"
    production = "production"


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class Tier(str, Enum):
    critical = "critical"
    major = "major"
    minor = "minor"


# ---------------------------------------------------------------------------
# Finding (contract section 2)
# ---------------------------------------------------------------------------
class Finding(BaseModel):
    key: str
    organ_zh: str
    name_zh: str
    name_en: str
    probability: float = Field(ge=0.0, le=1.0)
    positive: bool
    tier: Tier


# ---------------------------------------------------------------------------
# Summary + RadarResult (contract section 3.6)
# ---------------------------------------------------------------------------
class ResultSummary(BaseModel):
    critical_count: int
    major_count: int
    minor_count: int
    positive_count: int
    critical_findings: List[str] = Field(default_factory=list)
    major_findings: List[str] = Field(default_factory=list)


class RadarResult(BaseModel):
    study_uid: str
    model: str
    model_version: str
    mode: Mode
    generated_at: datetime
    positive_threshold: float
    findings: List[Finding]
    summary: ResultSummary
    disclaimer: str


# ---------------------------------------------------------------------------
# Jobs (contract section 3.4 / 3.5)
# ---------------------------------------------------------------------------
class JobCreateRequest(BaseModel):
    study_uid: str = Field(default="demo-study", description="Study instance UID.")
    source: Source = Source.demo
    file_ref: Optional[str] = Field(
        default=None, description="Path/URI to the NIfTI; ignored when source=demo."
    )


class JobAccepted(BaseModel):
    job_id: str
    status: JobStatus
    mode: Mode


class JobError(BaseModel):
    code: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = Field(ge=0.0, le=1.0)
    mode: Mode
    study_uid: str
    error: Optional[JobError] = None
    result: Optional[RadarResult] = None


# ---------------------------------------------------------------------------
# Health (contract section 3.1 / 3.2)
# ---------------------------------------------------------------------------
class HealthLive(BaseModel):
    status: str = "ok"


class HealthReady(BaseModel):
    status: str  # "ready" | "degraded"
    mode: Mode
    weights_loaded: bool
    gpu_available: bool
    model: str
    model_version: str


# ---------------------------------------------------------------------------
# Catalog (contract section 3.3)
# ---------------------------------------------------------------------------
class CatalogFindingBrief(BaseModel):
    key: str
    name_zh: str
    name_en: str


class CatalogOrgan(BaseModel):
    key: str
    name_zh: str
    name_en: str
    findings: List[CatalogFindingBrief] = Field(default_factory=list)


class CatalogResponse(BaseModel):
    organs: List[CatalogOrgan]
    positive_threshold: float
    critical_findings: List[str] = Field(default_factory=list)


def now_iso() -> datetime:
    """Timezone-aware 'now' (Asia/Shanghai implied via tz on client)."""
    return datetime.now(timezone.utc).astimezone()
