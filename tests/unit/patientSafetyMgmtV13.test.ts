/**
 * 健澜科技 jlmedaios - 患者安全管理 V13 单测（M418-D，M418 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFallBedInjuryOccurrenceRateV13,
  computeMedicationErrorOccurrenceRateV13,
  computePatientIdentificationCorrectRateV13,
  type PatientSafetyMgmtRecordV13,
} from "../../src/bff/aggregators/patientSafetyMgmtV13Aggregator";
import { patientSafetyMgmtV13Routes } from "../../src/bff/routes/patientSafetyMgmtV13";

const records: PatientSafetyMgmtRecordV13[] = [
  { correct: 990, identifyTotal: 1000, medicationError: 5, medicationTotal: 10000, fallBedInjury: 2, inpatientCaseTotal: 10000 },
  { correct: 990, identifyTotal: 1000, medicationError: 5, medicationTotal: 10000, fallBedInjury: 2, inpatientCaseTotal: 10000 },
];

describe("computePatientIdentificationCorrectRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("患者身份识别正确率 = 99.00%", () => {
    expect(computePatientIdentificationCorrectRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computePatientIdentificationCorrectRateV13([])).toBe(0);
  });
});

describe("computeMedicationErrorOccurrenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05（反向指标，越低越好）
  it("用药错误发生率 = 0.05%（反向指标）", () => {
    expect(computeMedicationErrorOccurrenceRateV13(records)).toBe(0.05);
  });
});

describe("computeFallBedInjuryOccurrenceRateV13", () => {
  // 算式：(2+2)/(10000+10000)×100 = 4/20000×100 = 0.02（反向指标，越低越好）
  it("跌倒坠床发生率 = 0.02%（反向指标）", () => {
    expect(computeFallBedInjuryOccurrenceRateV13(records)).toBe(0.02);
  });
});

describe("patientSafetyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/patient-safety-mgmt 路由存在且 auth:true", () => {
    const route = patientSafetyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-safety-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
