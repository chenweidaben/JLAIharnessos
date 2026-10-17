/**
 * 健澜科技 jlmedaios - 营养管理 V13 单测（M415-D，M415 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdmissionNutritionRiskScreeningRateV13,
  computeEnteralNutritionImplementationPassRateV13,
  computeNutritionTherapyAssessmentRateV13,
  type NutritionMgmtRecordV13,
} from "../../src/bff/aggregators/nutritionMgmtV13Aggregator";
import { nutritionMgmtV13Routes } from "../../src/bff/routes/nutritionMgmtV13";

const records: NutritionMgmtRecordV13[] = [
  { screened: 990, admissionTotal: 1000, assessed: 950, needNutritionTherapyTotal: 1000, qualified: 980, enteralTotal: 1000 },
  { screened: 990, admissionTotal: 1000, assessed: 950, needNutritionTherapyTotal: 1000, qualified: 980, enteralTotal: 1000 },
];

describe("computeAdmissionNutritionRiskScreeningRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("入院营养风险筛查率 = 99.00%", () => {
    expect(computeAdmissionNutritionRiskScreeningRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeAdmissionNutritionRiskScreeningRateV13([])).toBe(0);
  });
});

describe("computeNutritionTherapyAssessmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("营养治疗评估率 = 95.00%", () => {
    expect(computeNutritionTherapyAssessmentRateV13(records)).toBe(95.00);
  });
});

describe("computeEnteralNutritionImplementationPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("肠内营养实施合格率 = 98.00%", () => {
    expect(computeEnteralNutritionImplementationPassRateV13(records)).toBe(98.00);
  });
});

describe("nutritionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/nutrition-mgmt 路由存在且 auth:true", () => {
    const route = nutritionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nutrition-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
