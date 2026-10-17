/**
 * 健澜科技 jlmedaios - 患者流量 V13 单测（M364-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargedPatientsV13,
  computeOutpatientEmergencyVisitsV13,
  computeSurgeryCountV13,
  type PatientFlowRecordV13,
} from "../../src/bff/aggregators/patientFlowV13Aggregator";
import { patientFlowV13Routes } from "../../src/bff/routes/patientFlowV13";

const records: PatientFlowRecordV13[] = [
  { outpatientEmergencyVisits: 5000, dischargedPatients: 950, surgeryCount: 300 },
  { outpatientEmergencyVisits: 5000, dischargedPatients: 950, surgeryCount: 300 },
];

describe("computeOutpatientEmergencyVisitsV13", () => {
  // 算式：5000+5000 = 10000
  it("门急诊人次 = 10000", () => {
    expect(computeOutpatientEmergencyVisitsV13(records)).toBe(10000);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientEmergencyVisitsV13([])).toBe(0);
  });
});

describe("computeDischargedPatientsV13", () => {
  // 算式：950+950 = 1900
  it("出院人数 = 1900", () => {
    expect(computeDischargedPatientsV13(records)).toBe(1900);
  });
});

describe("computeSurgeryCountV13", () => {
  // 算式：300+300 = 600
  it("手术人数 = 600", () => {
    expect(computeSurgeryCountV13(records)).toBe(600);
  });
});

describe("patientFlowV13Routes 读路由", () => {
  it("GET /api/v1/patient-flow 路由存在且 auth:true", () => {
    const route = patientFlowV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-flow",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
