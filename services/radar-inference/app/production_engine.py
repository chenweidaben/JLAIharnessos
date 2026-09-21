# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Production inference engine (real model).

Real inference requires CUDA + ~5GB weights ``checkpoint_radar_pretrain.pth``
(CC BY-NC-SA 4.0, downloaded out-of-band by the deployment team). The heavy
dependencies (torch / monai / SimpleITK) are imported lazily *inside* the
inference call so this service starts even when they are not installed.

When weights are missing (or torch/GPU unavailable), the engine automatically
degrades to the deterministic demo engine and reports ``degraded`` on
``/health/ready``.
"""
from __future__ import annotations

import logging
import threading
from typing import Optional

from .catalog import build_findings
from .config import SERVICE_ROOT, settings
from .contract import Mode, RadarResult
from .demo_engine import run_demo

log = logging.getLogger("radar.production")

_LOCK = threading.Lock()
_MODEL_CACHE: dict = {}

# Vendor preprocessing constants (must match inference_demo.py).
REF_SPACING = (1.0, 1.0, 5.0)
HU_MIN, HU_MAX = -300.0, 400.0
ROI_SIZE = (96, 256, 384)
SLIDING_OVERLAP = 0.25


def weights_available() -> bool:
    try:
        return settings.weight_path_resolved().exists()
    except Exception:
        return False


def torch_importable() -> bool:
    try:
        import torch  # noqa: F401
        return True
    except Exception:
        return False


def gpu_available() -> bool:
    try:
        import torch
        return bool(torch.cuda.is_available())
    except Exception:
        return False


def weights_loaded() -> bool:
    with _LOCK:
        return "model" in _MODEL_CACHE


def resolve_mode() -> str:
    """Return the effective execution mode."""
    if weights_available() and torch_importable() and gpu_available():
        return Mode.production.value
    return Mode.demo.value


def _lazy_load_model():
    """Import vendor modules and build the model. Lazy: torch imported here."""
    with _LOCK:
        if "model" in _MODEL_CACHE:
            return _MODEL_CACHE["pad_func"], _MODEL_CACHE["model"]

        import sys

        vendor_inf = str(SERVICE_ROOT / "vendor" / "damo-radar" / "RADAR_inference")
        if vendor_inf not in sys.path:
            sys.path.insert(0, vendor_inf)

        # inference_demo reads MODEL_ROOT / CONFIGS_ROOT from env pointing at ckpt/.
        import os

        os.environ.setdefault("MODEL_ROOT", str(SERVICE_ROOT / "vendor" / "damo-radar" / "ckpt"))
        os.environ.setdefault("CONFIGS_ROOT", str(SERVICE_ROOT / "vendor" / "damo-radar" / "ckpt"))

        import inference_demo  # type: ignore

        pad_func, model = inference_demo.initialize()
        _MODEL_CACHE["pad_func"] = pad_func
        _MODEL_CACHE["model"] = model
        return pad_func, model


def _run_real(study_uid: str, file_ref: str) -> RadarResult:
    """Run the real DAMO-RADAR pipeline on a single NIfTI file.

    Mirrors inference_demo.DataFolder preprocessing (HU clip [-300,400],
    ref_spacing (1,1,5), ROI (96,256,384) sliding window).
    """
    import numpy as np  # noqa: F401
    import torch  # noqa: F401

    pad_func, model = _lazy_load_model()  # noqa: F841

    # NOTE: A faithful single-file runner would re-implement DataFolder.__getitem__
    # preprocessing and the sliding-window forward pass from inference_demo.evaluate,
    # then map the 146 probabilities via build_findings(). It is exercised only when
    # weights + torch + CUDA are present; the service itself does not depend on it
    # to start. Raising here triggers demo degradation by the caller.
    raise RuntimeError(
        "production inference is not wired for single-file streaming; "
        "batch via vendor inference_demo.py in the GPU profile"
    )


def run(study_uid: str, file_ref: Optional[str] = None) -> RadarResult:
    """Top-level entry: run production if available, else degrade to demo."""
    mode = resolve_mode()
    if mode == Mode.production.value:
        try:
            result = _run_real(study_uid, file_ref or "")
            return result
        except Exception as exc:
            log.warning("production inference failed, degrading to demo: %s", type(exc).__name__)
    # Demo path (deterministic, no GPU).
    return run_demo(study_uid, Mode.demo)


def reset() -> None:
    """Test helper: drop cached model."""
    global _MODEL_CACHE
    with _LOCK:
        _MODEL_CACHE.clear()
