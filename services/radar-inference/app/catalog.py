# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Builds the 18-organ / 146-finding catalog and classifies result findings.

Data source of truth: ``.radar-contract.json`` (project root) with an embedded
fallback copy shipped inside this service so it runs standalone.
"""
from __future__ import annotations

import json
import threading
from functools import lru_cache
from typing import Dict, List

from .config import EMBEDDED_CONTRACT, PROJECT_ROOT_CONTRACT, settings
from .contract import (
    CatalogFindingBrief,
    CatalogOrgan,
    CatalogResponse,
    Finding,
    ResultSummary,
    Tier,
)

_LOCK = threading.Lock()

# Bilingual names for the 18 fixed organs (matches vendor organ_dict).
ORGAN_EN: Dict[str, str] = {
    "主动脉": "Aorta",
    "十二指肠": "Duodenum",
    "大肠": "Large bowel",
    "小肠": "Small bowel",
    "心脏": "Heart",
    "肋骨": "Rib",
    "肝": "Liver",
    "肺": "Lung",
    "肾": "Kidney",
    "肾上腺": "Adrenal gland",
    "胃": "Stomach",
    "胆囊": "Gallbladder",
    "胰腺": "Pancreas",
    "脾": "Spleen",
    "膀胱": "Bladder",
    "门静脉": "Portal vein",
    "食管": "Esophagus",
    "骶骨": "Sacrum",
}


class ContractData:
    """Parsed, immutable contract snapshot."""

    def __init__(self, organs: List[str], findings: List[dict]):
        self.organs: List[str] = organs
        self.findings: List[dict] = findings
        # findings in declared order, keyed by their contract key
        self.by_key: Dict[str, dict] = {f["key"]: f for f in findings}

    @property
    def finding_count(self) -> int:
        return len(self.findings)

    @property
    def organ_count(self) -> int:
        return len(self.organs)


def _read_contract() -> ContractData:
    """Load contract JSON, preferring the project-root file when present."""
    candidates = [PROJECT_ROOT_CONTRACT, EMBEDDED_CONTRACT]
    last_err: Exception | None = None
    for path in candidates:
        try:
            with open(path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
            organs = list(raw["organs"])
            findings = list(raw["findings"])
            return ContractData(organs, findings)
        except Exception as exc:  # pragma: no cover - defensive
            last_err = exc
    raise RuntimeError(f"unable to load radar contract: {last_err}")


@lru_cache(maxsize=1)
def get_contract() -> ContractData:
    return _read_contract()


def reload_contract() -> ContractData:
    """Force a reload (used by tests that mutate config)."""
    get_contract.cache_clear()
    return get_contract()


def classify_tier(key: str, probability: float) -> Tier:
    """Severity class: critical set wins, then >=major_threshold, else minor."""
    if key in settings.critical_findings:
        return Tier.critical
    if probability >= settings.major_threshold:
        return Tier.major
    return Tier.minor


def build_catalog() -> CatalogResponse:
    """Static catalog: 18 organs, each with its finding briefs."""
    contract = get_contract()
    organs: List[CatalogOrgan] = []
    # group findings by organ_zh, preserving declared finding order
    by_organ: Dict[str, List[CatalogFindingBrief]] = {o: [] for o in contract.organs}
    for f in contract.findings:
        brief = CatalogFindingBrief(key=f["key"], name_zh=f["name_zh"], name_en=f["name_en"])
        organ = f["organ_zh"]
        by_organ.setdefault(organ, []).append(brief)
    for organ in contract.organs:
        organs.append(
            CatalogOrgan(
                key=organ,
                name_zh=organ,
                name_en=ORGAN_EN.get(organ, organ),
                findings=by_organ.get(organ, []),
            )
        )
    return CatalogResponse(
        organs=organs,
        positive_threshold=settings.positive_threshold,
        critical_findings=sorted(settings.critical_findings),
    )


def build_findings(probabilities: Dict[str, float]) -> tuple[List[Finding], ResultSummary]:
    """Turn a key->probability map into ordered Findings plus a summary."""
    contract = get_contract()
    findings: List[Finding] = []
    crit_keys: List[str] = []
    major_keys: List[str] = []
    pos_crit = pos_major = pos_minor = 0
    for f in contract.findings:
        key = f["key"]
        prob = float(probabilities.get(key, 0.0))
        prob = max(0.0, min(1.0, prob))
        positive = prob >= settings.positive_threshold
        tier = classify_tier(key, prob)
        findings.append(
            Finding(
                key=key,
                organ_zh=f["organ_zh"],
                name_zh=f["name_zh"],
                name_en=f["name_en"],
                probability=prob,
                positive=positive,
                tier=tier,
            )
        )
        if positive:
            if tier == Tier.critical:
                pos_crit += 1
                crit_keys.append(key)
            elif tier == Tier.major:
                pos_major += 1
                major_keys.append(key)
            else:
                pos_minor += 1
    summary = ResultSummary(
        critical_count=pos_crit,
        major_count=pos_major,
        minor_count=pos_minor,
        positive_count=pos_crit + pos_major + pos_minor,
        critical_findings=crit_keys,
        major_findings=major_keys,
    )
    return findings, summary
