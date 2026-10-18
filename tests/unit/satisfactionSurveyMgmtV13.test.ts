/**
 * 健澜科技 jlmedaios - 满意度调查管理 V13 单测（M451-D，M451 收官，医患关系与投诉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSatisfactionSurveyInpatientRateV13,
  computeSatisfactionSurveyOutpatientRateV13,
  computeSatisfactionSurveyStaffRateV13,
  type SatisfactionSurveyMgmtRecordV13,
} from "../../src/bff/aggregators/satisfactionSurveyMgmtV13Aggregator";
import { satisfactionSurveyMgmtV13Routes } from "../../src/bff/routes/satisfactionSurveyMgmtV13";

const records: SatisfactionSurveyMgmtRecordV13[] = [
  { outpatientSatisfied: 950, outpatientTotal: 1000, inpatientSatisfied: 900, inpatientTotal: 1000, staffSatisfied: 980, staffTotal: 1000 },
  { outpatientSatisfied: 950, outpatientTotal: 1000, inpatientSatisfied: 900, inpatientTotal: 1000, staffSatisfied: 980, staffTotal: 1000 },
];

describe("computeSatisfactionSurveyOutpatientRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("门诊满意度 = 95.00%", () => {
    expect(computeSatisfactionSurveyOutpatientRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSatisfactionSurveyOutpatientRateV13([])).toBe(0);
  });
});

describe("computeSatisfactionSurveyInpatientRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("住院满意度 = 90.00%", () => {
    expect(computeSatisfactionSurveyInpatientRateV13(records)).toBe(90.00);
  });
});

describe("computeSatisfactionSurveyStaffRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("职工满意度 = 98.00%", () => {
    expect(computeSatisfactionSurveyStaffRateV13(records)).toBe(98.00);
  });
});

describe("satisfactionSurveyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/satisfaction-survey-mgmt 路由存在且 auth:true", () => {
    const route = satisfactionSurveyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/satisfaction-survey-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
