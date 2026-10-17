/**
 * 健澜科技 jlmedaios - 满意度调查明细 V13 单测（M400-B，避让旧版 satisfaction-survey）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCaregiverSatisfactionRateV13,
  computeInpatientSatisfactionRateV13,
  computeOutpatientSatisfactionRateV13,
  type SatisfactionSurveyDetailRecordV13,
} from "../../src/bff/aggregators/satisfactionSurveyDetailV13Aggregator";
import { satisfactionSurveyDetailV13Routes } from "../../src/bff/routes/satisfactionSurveyDetailV13";

const records: SatisfactionSurveyDetailRecordV13[] = [
  { outpatientSatisfied: 900, outpatientTotal: 1000, inpatientSatisfied: 850, inpatientTotal: 1000, caregiverSatisfied: 950, caregiverTotal: 1000 },
  { outpatientSatisfied: 900, outpatientTotal: 1000, inpatientSatisfied: 850, inpatientTotal: 1000, caregiverSatisfied: 950, caregiverTotal: 1000 },
];

describe("computeOutpatientSatisfactionRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("门诊满意度 = 90.00%", () => {
    expect(computeOutpatientSatisfactionRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientSatisfactionRateV13([])).toBe(0);
  });
});

describe("computeInpatientSatisfactionRateV13", () => {
  // 算式：(850+850)/(1000+1000) = 1700/2000×100 = 85.00
  it("住院满意度 = 85.00%", () => {
    expect(computeInpatientSatisfactionRateV13(records)).toBe(85.00);
  });
});

describe("computeCaregiverSatisfactionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("陪护满意度 = 95.00%", () => {
    expect(computeCaregiverSatisfactionRateV13(records)).toBe(95.00);
  });
});

describe("satisfactionSurveyDetailV13Routes 读路由", () => {
  it("GET /api/v1/satisfaction-survey-detail 路由存在且 auth:true", () => {
    const route = satisfactionSurveyDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/satisfaction-survey-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
