# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Demo inference engine.

Parses the vendor pre-computed ``RADAR_infer_results_demo.csv`` and turns its
146 probabilities into a contract-aligned RadarResult. Fully deterministic,
requires no GPU, no torch, no weights.
"""
from __future__ import annotations

import csv
import logging
import threading
from typing import Dict, List, Optional, Tuple

from .catalog import build_findings, get_contract
from .config import DEMO_CSV, settings
from .contract import Mode, RadarResult, now_iso
from .logging_redact import safe_ref

log = logging.getLogger("radar.demo")

_LOCK = threading.Lock()
_CACHE: Optional[Dict[str, float]] = None
_DEMO_FILE_NAME: str = "[vendor-demo]"


def _parse_csv() -> Tuple[Dict[str, float], str]:
    """Return {contract_key: probability} and the (redacted) source file name."""
    contract = get_contract()
    by_key = contract.by_key

    with open(DEMO_CSV, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        row = next(reader)

    # Build column -> contract key mapping.
    probabilities: Dict[str, float] = {}
    source_name = ""
    for idx, col in enumerate(header):
        col = col.strip()
        if col == "file_name":
            source_name = row[idx].strip()
            continue
        # raw key is everything before the first " ("
        raw_key = col.split(" (", 1)[0].strip()
        contract_key: Optional[str] = None
        if raw_key in by_key:
            contract_key = raw_key
        else:
            # fallback: prefix match (handles nested-paren CSV headers such as
            # the GIST column whose contract key carries an extraction artifact)
            matches = [k for k in by_key if k.startswith(raw_key)]
            if len(matches) == 1:
                contract_key = matches[0]
        if contract_key is None:
            log.warning("demo CSV column has no contract mapping: %s", col)
            continue
        try:
            probabilities[contract_key] = float(row[idx])
        except ValueError:
            probabilities[contract_key] = 0.0

    if len(probabilities) != contract.finding_count:
        log.warning(
            "demo CSV mapped %d/%d findings", len(probabilities), contract.finding_count
        )
    return probabilities, source_name


def get_demo_probabilities() -> Dict[str, float]:
    global _CACHE
    with _LOCK:
        if _CACHE is None:
            probs, source_name = _parse_csv()
            # Register the demo vendor filename as sensitive so it never leaks.
            from .logging_redact import register_sensitive

            if source_name:
                register_sensitive(source_name)
            log.info("demo engine loaded from %s", safe_ref(str(DEMO_CSV)))
            _CACHE = probs
        return _CACHE


def run_demo(study_uid: str, mode: Mode = Mode.demo) -> RadarResult:
    """Produce the deterministic demo result for a study UID."""
    probs = get_demo_probabilities()
    findings, summary = build_findings(probs)
    result = RadarResult(
        study_uid=study_uid,
        model=settings.model,
        model_version=settings.model_version,
        mode=mode,
        generated_at=now_iso(),
        positive_threshold=settings.positive_threshold,
        findings=findings,
        summary=summary,
        disclaimer=settings.disclaimer,
    )
    log.info(
        "demo result built study=%s positive=%d critical=%d",
        study_uid,
        summary.positive_count,
        summary.critical_count,
    )
    return result


def reset_cache() -> None:
    """Test helper: drop the parsed-CSV cache."""
    global _CACHE
    with _LOCK:
        _CACHE = None
