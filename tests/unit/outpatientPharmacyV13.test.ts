/**
 * 健澜科技 jlmedaios - 门诊药房 V13 单测（M390-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientMedicationConsultationCountV13,
  computeOutpatientPrescriptionDispenseCountV13,
  computePrescriptionDispenseTimeAvgV13,
  type OutpatientPharmacyRecordV13,
} from "../../src/bff/aggregators/outpatientPharmacyV13Aggregator";
import { outpatientPharmacyV13Routes } from "../../src/bff/routes/outpatientPharmacyV13";

const records: OutpatientPharmacyRecordV13[] = [
  { dispenseCount: 1000, totalDispenseMinutes: 6000, consultationCount: 100 },
  { dispenseCount: 1000, totalDispenseMinutes: 6000, consultationCount: 100 },
];

describe("computeOutpatientPrescriptionDispenseCountV13", () => {
  // 算式：1000+1000 = 2000
  it("门诊处方调配数 = 2000 张", () => {
    expect(computeOutpatientPrescriptionDispenseCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientPrescriptionDispenseCountV13([])).toBe(0);
  });
});

describe("computePrescriptionDispenseTimeAvgV13", () => {
  // 算式：(6000+6000)/(1000+1000) = 12000/2000 = 6.00
  it("平均处方调配时长 = 6.00 分钟", () => {
    expect(computePrescriptionDispenseTimeAvgV13(records)).toBe(6.00);
  });
});

describe("computeOutpatientMedicationConsultationCountV13", () => {
  // 算式：100+100 = 200
  it("门诊用药咨询数 = 200 次", () => {
    expect(computeOutpatientMedicationConsultationCountV13(records)).toBe(200);
  });
});

describe("outpatientPharmacyV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-pharmacy 路由存在且 auth:true", () => {
    const route = outpatientPharmacyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-pharmacy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
