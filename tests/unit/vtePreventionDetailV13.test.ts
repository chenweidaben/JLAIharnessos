/**
 * 健澜科技 jlmedaios - VTE 预防管理（细节）V13 单测（M422-A，detail 避让旧版 vtePreventionMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMechanicalPreventionUsageRateV13,
  computePharmaceuticalPreventionUsageRateV13,
  computeVteRiskAssessmentRateV13,
  type VtePreventionDetailRecordV13,
} from "../../src/bff/aggregators/vtePreventionDetailV13Aggregator";
import { vtePreventionDetailV13Routes } from "../../src/bff/routes/vtePreventionDetailV13";

const records: VtePreventionDetailRecordV13[] = [
  { assessed: 950, shouldAssess: 1000, mechanicalUsed: 800, pharmaceuticalUsed: 700, highRiskTotal: 1000 },
  { assessed: 950, shouldAssess: 1000, mechanicalUsed: 800, pharmaceuticalUsed: 700, highRiskTotal: 1000 },
];

describe("computeVteRiskAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("VTE 风险评估率 = 95.00%", () => {
    expect(computeVteRiskAssessmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeVteRiskAssessmentRateV13([])).toBe(0);
  });
});

describe("computeMechanicalPreventionUsageRateV13", () => {
  // 算式：(800+800)/(1000+1000)×100 = 1600/2000×100 = 80.00
  it("机械预防使用率 = 80.00%", () => {
    expect(computeMechanicalPreventionUsageRateV13(records)).toBe(80.00);
  });
});

describe("computePharmaceuticalPreventionUsageRateV13", () => {
  // 算式：(700+700)/(1000+1000)×100 = 1400/2000×100 = 70.00
  it("药物预防使用率 = 70.00%", () => {
    expect(computePharmaceuticalPreventionUsageRateV13(records)).toBe(70.00);
  });
});

describe("vtePreventionDetailV13Routes 读路由", () => {
  it("GET /api/v1/vte-prevention-detail 路由存在且 auth:true", () => {
    const route = vtePreventionDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/vte-prevention-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
