/**
 * 健澜科技 jlmedaios - 肾病与血液净化管理 V5 纯函数单测（M265-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDialysisAdequacyV5,
  buildNephrologyV5Report,
  stageCKDV5,
} from "../../src/bff/aggregators/nephrologyV5ReportAggregator";

describe("stageCKDV5", () => {
  it("eGFR 25+ACR 350 → G4极高危每3月复查", () => {
    expect(stageCKDV5({ value: 25 }, { acr: 350 }).stage).toBe("G4");
  });
});

describe("assessDialysisAdequacyV5", () => {
  it("Kt/V 1.0+UR 60% → 不充分需延长时间", () => {
    expect(assessDialysisAdequacyV5({ value: 1.0 }, { value: 60 }).adequate).toBe(false);
  });
});

describe("buildNephrologyV5Report", () => {
  it("生成 AKI 数据", () => {
    const r = buildNephrologyV5Report("30d");
    expect(r.aki.crrt).toBeGreaterThan(0);
  });

  it("生成 CKD 数据", () => {
    const r = buildNephrologyV5Report("30d");
    expect(r.ckd.stage3).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildNephrologyV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
