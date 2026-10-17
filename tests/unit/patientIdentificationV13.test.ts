/**
 * 健澜科技 jlmedaios - 患者身份识别 V13 单测（M394-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePatientIdentificationCorrectRateV13,
  computeTransfusionDoubleCheckCorrectRateV13,
  computeWristbandWearingRateV13,
  type PatientIdentificationRecordV13,
} from "../../src/bff/aggregators/patientIdentificationV13Aggregator";
import { patientIdentificationV13Routes } from "../../src/bff/routes/patientIdentificationV13";

const records: PatientIdentificationRecordV13[] = [
  { correctCount: 980, totalCount: 1000, wristbandWornCount: 950, wristbandShouldCount: 1000, transfusionCheckCorrectCount: 990, transfusionTotalCount: 1000 },
  { correctCount: 980, totalCount: 1000, wristbandWornCount: 950, wristbandShouldCount: 1000, transfusionCheckCorrectCount: 990, transfusionTotalCount: 1000 },
];

describe("computePatientIdentificationCorrectRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("身份识别正确率 = 98.00%", () => {
    expect(computePatientIdentificationCorrectRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computePatientIdentificationCorrectRateV13([])).toBe(0);
  });
});

describe("computeWristbandWearingRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("腕带佩戴率 = 95.00%", () => {
    expect(computeWristbandWearingRateV13(records)).toBe(95.00);
  });
});

describe("computeTransfusionDoubleCheckCorrectRateV13", () => {
  // 算式：(990+990)/(1000+1000) = 1980/2000×100 = 99.00
  it("输血核对正确率 = 99.00%", () => {
    expect(computeTransfusionDoubleCheckCorrectRateV13(records)).toBe(99.00);
  });
});

describe("patientIdentificationV13Routes 读路由", () => {
  it("GET /api/v1/patient-identification 路由存在且 auth:true", () => {
    const route = patientIdentificationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-identification",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
