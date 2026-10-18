/**
 * 健澜科技 jlmedaios - 营养质量管理 V13 单测（M430-C，-quality 后缀避让旧版 nutritionMgmtV13（M415））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNutritionAssessmentCoverageRateV13,
  computeNutritionConsultationResponseRateV13,
  computeNutritionSupportAppropriateRateV13,
  type NutritionQualityMgmtRecordV13,
} from "../../src/bff/aggregators/nutritionQualityMgmtV13Aggregator";
import { nutritionQualityMgmtV13Routes } from "../../src/bff/routes/nutritionQualityMgmtV13";

const records: NutritionQualityMgmtRecordV13[] = [
  { assessed: 950, inpatientTotal: 1000, appropriate: 980, supportTotal: 1000, responded: 990, consultTotal: 1000 },
  { assessed: 950, inpatientTotal: 1000, appropriate: 980, supportTotal: 1000, responded: 990, consultTotal: 1000 },
];

describe("computeNutritionAssessmentCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("营养评估覆盖率 = 95.00%", () => {
    expect(computeNutritionAssessmentCoverageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNutritionAssessmentCoverageRateV13([])).toBe(0);
  });
});

describe("computeNutritionSupportAppropriateRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("营养支持合理率 = 98.00%", () => {
    expect(computeNutritionSupportAppropriateRateV13(records)).toBe(98.00);
  });
});

describe("computeNutritionConsultationResponseRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("营养会诊响应率 = 99.00%", () => {
    expect(computeNutritionConsultationResponseRateV13(records)).toBe(99.00);
  });
});

describe("nutritionQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/nutrition-quality-mgmt 路由存在且 auth:true", () => {
    const route = nutritionQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nutrition-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
