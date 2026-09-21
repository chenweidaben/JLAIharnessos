# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Centralized runtime configuration for the RADAR-Fusion inference service.

All tunables read from environment variables so hospital deployments can adjust
without code changes. No patient data is stored here.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# app/config.py -> app/ -> service_root/
SERVICE_ROOT = Path(__file__).resolve().parent.parent
VENDOR_DIR = SERVICE_ROOT / "vendor" / "damo-radar"
DEMO_CSV = VENDOR_DIR / "RADAR_infer_results_demo.csv"
EMBEDDED_CONTRACT = Path(__file__).resolve().parent / "data" / "radar_contract.json"
# Project-root contract (two levels above service root) used when present.
PROJECT_ROOT_CONTRACT = SERVICE_ROOT.parent.parent.parent / ".radar-contract.json"

DEFAULT_WEIGHT_REL = Path("models") / "radar" / "checkpoint_radar_pretrain.pth"
DEFAULT_TEXT_EMB_REL = VENDOR_DIR / "ckpt" / "infer_text_embedding_radar.pt"


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_str(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


# ---------------------------------------------------------------------------
# Critical findings (curated). Keys use the exact `<organ>_<name>` form from the
# 146-finding contract. Covers malignant tumours / acute life-threatening events
# per contract section 2. Override wholesale with RADAR_CRITICAL_FINDINGS
# (comma-separated keys) for hospital tuning.
# ---------------------------------------------------------------------------
DEFAULT_CRITICAL_FINDINGS: set[str] = {
    # malignant tumours
    "肝_肝细胞癌",
    "肝_胆管癌",                      # intrahepatic cholangiocarcinoma
    "胆囊_胆囊癌",
    "胆囊_胆管癌",                    # cholangiocarcinoma
    "胰腺_肿瘤或胰腺癌",
    "胃_胃癌",
    "大肠_结肠癌",
    "大肠_直肠癌",
    "小肠_淋巴瘤",
    "肾_肾细胞癌（透明细胞癌）",
    "肾_肾盂癌",
    "膀胱_膀胱癌",
    "脾_脾脏淋巴瘤",
    "肺_肺占位",
    # metastases (各器官转移瘤)
    "肺_转移瘤",
    "肝_转移瘤",
    "肾上腺_转移瘤",
    "肋骨_转移瘤（乳腺癌 骨转移）",
    # acute / life-threatening
    "主动脉_主动脉夹层",
    "大肠_阑尾炎",
    "脾_梗死",
    "大肠_肠穿孔",
    "大肠_肠套叠",
    "小肠_套叠",
    "门静脉_栓塞",
}

# Keys whose CSV header uses nested parentheses and therefore does NOT split
# cleanly on the first " (". These are matched by prefix during CSV ingestion.
_PREFIX_MATCH_FINDINGS = {
    "胃_间质瘤（gist）",
}


def _load_critical_set() -> set[str]:
    raw = _env_str("RADAR_CRITICAL_FINDINGS")
    if raw:
        return {k.strip() for k in raw.split(",") if k.strip()}
    return set(DEFAULT_CRITICAL_FINDINGS)


@dataclass
class Settings:
    """Runtime settings snapshot. Mutable so tests can override in-process."""

    service_name: str = "radar-inference"
    model: str = "damo-radar"
    model_version: str = "eaec6129"

    host: str = field(default_factory=lambda: _env_str("RADAR_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("RADAR_PORT", 8090))

    # Auth
    internal_token: str = field(default_factory=lambda: _env_str("RADAR_INTERNAL_TOKEN"))

    # Thresholds
    positive_threshold: float = field(default_factory=lambda: _env_float("RADAR_POSITIVE_THRESHOLD", 0.5))
    major_threshold: float = field(default_factory=lambda: _env_float("RADAR_MAJOR_THRESHOLD", 0.6))
    critical_findings: set[str] = field(default_factory=_load_critical_set)

    # Concurrency / timeouts
    max_concurrency: int = field(default_factory=lambda: max(1, _env_int("RADAR_MAX_CONCURRENCY", 2)))
    job_timeout_seconds: float = field(default_factory=lambda: _env_float("RADAR_JOB_TIMEOUT", 600.0))
    demo_delay_seconds: float = field(default_factory=lambda: _env_float("RADAR_DEMO_DELAY", 0.0))

    # Weight path override
    weight_path: Path = field(
        default_factory=lambda: Path(_env_str("RADAR_WEIGHT_PATH", str(SERVICE_ROOT / DEFAULT_WEIGHT_REL)))
    )

    disclaimer: str = (
        "本结果由 DAMO-RADAR AI 模型辅助生成，仅作第二阅片参考，最终诊断须由放射科医师复核签名。"
    )

    def weight_path_resolved(self) -> Path:
        p = Path(self.weight_path)
        if not p.is_absolute():
            p = (SERVICE_ROOT / p).resolve()
        return p


# Single shared settings object. Tests may mutate its attributes directly.
settings = Settings()
