/**
 * 健澜科技 jlmedaios - 血液透析管理 V13 单测（M417-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDialysisAccessInfectionRateV13,
  computeDialysisHypotensionRateV13,
  computeDialysisKtvPassRateV13,
  type DialysisMgmtRecordV13,
} from "../../src/bff/aggregators/dialysisMgmtV13Aggregator";
import { dialysisMgmtV13Routes } from "../../src/bff/routes/dialysisMgmtV13";

const records: DialysisMgmtRecordV13[] = [
  { ktvQualified: 900, dialysisTotal: 1000, hypotension: 20, dialysisCaseTotal: 1000, infection: 5, accessTotal: 1000 },
  { ktvQualified: 900, dialysisTotal: 1000, hypotension: 20, dialysisCaseTotal: 1000, infection: 5, accessTotal: 1000 },
];

describe("computeDialysisKtvPassRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("透析充分性 KtV 合格率 = 90.00%", () => {
    expect(computeDialysisKtvPassRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeDialysisKtvPassRateV13([])).toBe(0);
  });
});

describe("computeDialysisHypotensionRateV13", () => {
  // 算式：(20+20)/(1000+1000)×100 = 40/2000×100 = 2.00（反向指标，越低越好）
  it("透析低血压发生率 = 2.00%（反向指标）", () => {
    expect(computeDialysisHypotensionRateV13(records)).toBe(2.00);
  });
});

describe("computeDialysisAccessInfectionRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50（反向指标，越低越好）
  it("透析通路感染率 = 0.50%（反向指标）", () => {
    expect(computeDialysisAccessInfectionRateV13(records)).toBe(0.50);
  });
});

describe("dialysisMgmtV13Routes 读路由", () => {
  it("GET /api/v1/dialysis-mgmt 路由存在且 auth:true", () => {
    const route = dialysisMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dialysis-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
