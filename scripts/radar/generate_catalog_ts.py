# -*- coding: utf-8 -*-
"""Generate web/src/mock/radarCatalogData.ts from .radar-contract.json.

Single source of truth: project-root `.radar-contract.json` (18 organs / 146
findings, header-parse of vendor/damo-radar RADAR_infer_results_demo.csv).
Running this script regenerates the checked-in deterministic mock data so the
BFF/frontend degradation numbers stay identical to the Python demo engine.

Usage (from repo root):
    python scripts/radar/generate_catalog_ts.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / ".radar-contract.json"
OUT = ROOT / "web" / "src" / "mock" / "radarCatalogData.ts"

HEADER = '''/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR 内置静态目录（与契约 docs/RADAR_FUSION_CONTRACT.md 同源）：
 *  - 18 个器官 / 解剖结构（顺序固定）
 *  - 146 项临床发现（key/organ_zh/name_zh/name_en/demo_prob）
 * 由 .radar-contract.json 经 scripts/radar/generate_catalog_ts.py 自动生成，禁止手改字段名。
 * 用途：推理服务不可用 / demo 模式下的确定性降级数据，保证前端不白屏。
 */
'''


def fmt_num(v: float) -> str:
    """Render a float as a shortest round-trip JS numeric literal.

    Prefer fixed-point decimal form (no scientific notation) to match the
    hand-written style; trailing zeros are stripped.
    """
    if v != v or v in (float("inf"), float("-inf")):  # NaN / inf guard
        return "0"
    if v == 0:
        return "0"
    s = repr(v)
    if "e" in s or "E" in s:
        s = ("%.20f" % v).rstrip("0").rstrip(".")
    return s


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    organs = data["organs"]
    findings = data["findings"]

    lines = [HEADER, "export const RADAR_ORGAN_KEYS: string[] = ["]
    for o in organs:
        lines.append(f'  {json.dumps(o, ensure_ascii=False)},')
    lines.append("];")
    lines.append("")
    lines.append("export interface RadarDemoFinding {")
    lines.append("  key: string;")
    lines.append("  organ_zh: string;")
    lines.append("  name_zh: string;")
    lines.append("  name_en: string;")
    lines.append("  demo_prob: number;")
    lines.append("}")
    lines.append("")
    lines.append("export const RADAR_DEMO_FINDINGS: RadarDemoFinding[] = [")
    for f in findings:
        lines.append("  {")
        lines.append(f'    "key": {json.dumps(f["key"], ensure_ascii=False)},')
        lines.append(f'    "organ_zh": {json.dumps(f["organ_zh"], ensure_ascii=False)},')
        lines.append(f'    "name_zh": {json.dumps(f["name_zh"], ensure_ascii=False)},')
        lines.append(f'    "name_en": {json.dumps(f["name_en"], ensure_ascii=False)},')
        lines.append(f'    "demo_prob": {fmt_num(float(f["demo_prob"]))}')
        lines.append("  },")
    lines.append("];")
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"organs={len(organs)} findings={len(findings)} -> {OUT}")


if __name__ == "__main__":
    main()
