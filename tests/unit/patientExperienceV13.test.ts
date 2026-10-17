/**
 * 健澜科技 jlmedaios - 患者体验 V13 单测（M358-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargeFollowUpRateV13,
  computeInpatientSatisfactionV13,
  computeOutpatientSatisfactionV13,
  type PatientExperienceRecordV13,
} from "../../src/bff/aggregators/patientExperienceV13Aggregator";
import { patientExperienceV13Routes } from "../../src/bff/routes/patientExperienceV13";

const records: PatientExperienceRecordV13[] = [
  { outpatientSatisfaction: 95, inpatientSatisfaction: 94, dischargeFollowedUp: 480, dischargeCount: 500 },
  { outpatientSatisfaction: 97, inpatientSatisfaction: 96, dischargeFollowedUp: 470, dischargeCount: 500 },
];

describe("computeOutpatientSatisfactionV13", () => {
  // 算式：(95+97)/2 = 96.00
  it("门诊患者满意度 = 96.00", () => {
    expect(computeOutpatientSatisfactionV13(records)).toBe(96.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientSatisfactionV13([])).toBe(0);
  });
});

describe("computeInpatientSatisfactionV13", () => {
  // 算式：(94+96)/2 = 95.00
  it("住院患者满意度 = 95.00", () => {
    expect(computeInpatientSatisfactionV13(records)).toBe(95.00);
  });
});

describe("computeDischargeFollowUpRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("出院后随访率 = 95.00%", () => {
    expect(computeDischargeFollowUpRateV13(records)).toBe(95.00);
  });
});

describe("patientExperienceV13Routes 读路由", () => {
  it("GET /api/v1/patient-experience 路由存在且 auth:true", () => {
    const route = patientExperienceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-experience",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
