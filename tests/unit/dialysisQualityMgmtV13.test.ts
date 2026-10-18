/**
 * 健澜科技 jlmedaios - 透析质量管理 V13 单测（M429-A，-quality 后缀避让旧版 dialysisMgmtV13（M417））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDialysisAccessInfectionRateV13,
  computeDialysisAdequacyRateV13,
  computeDialysisHypotensionOccurrenceRateV13,
  type DialysisQualityMgmtRecordV13,
} from "../../src/bff/aggregators/dialysisQualityMgmtV13Aggregator";
import { dialysisQualityMgmtV13Routes } from "../../src/bff/routes/dialysisQualityMgmtV13";

const records: DialysisQualityMgmtRecordV13[] = [
  { adequate: 950, dialysisTotal: 1000, hypotension: 30, accessInfection: 10, dialysisSessionTotal: 10000 },
  { adequate: 950, dialysisTotal: 1000, hypotension: 30, accessInfection: 10, dialysisSessionTotal: 10000 },
];

describe("computeDialysisAdequacyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("透析充分性达标率 = 95.00%", () => {
    expect(computeDialysisAdequacyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDialysisAdequacyRateV13([])).toBe(0);
  });
});

describe("computeDialysisHypotensionOccurrenceRateV13", () => {
  // 算式：(30+30)/(10000+10000)×100 = 60/20000×100 = 0.30%（反向指标）
  it("透析低血压发生率 = 0.30%（反向指标）", () => {
    expect(computeDialysisHypotensionOccurrenceRateV13(records)).toBe(0.30);
  });
});

describe("computeDialysisAccessInfectionRateV13", () => {
  // 算式：(10+10)/(10000+10000)×100 = 20/20000×100 = 0.10%（反向指标）
  it("透析通路感染率 = 0.10%（反向指标）", () => {
    expect(computeDialysisAccessInfectionRateV13(records)).toBe(0.10);
  });
});

describe("dialysisQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/dialysis-quality-mgmt 路由存在且 auth:true", () => {
    const route = dialysisQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dialysis-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
