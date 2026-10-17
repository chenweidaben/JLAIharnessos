/**
 * 健澜科技 jlmedaios - 临床药学 V13 单测（M380-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPharmacistRoundCountV13,
  computeMedicationOrderAuditCountV13,
  computePrescriptionReviewCountV13,
  type ClinicalPharmacyRecordV13,
} from "../../src/bff/aggregators/clinicalPharmacyV13Aggregator";
import { clinicalPharmacyV13Routes } from "../../src/bff/routes/clinicalPharmacyV13";

const records: ClinicalPharmacyRecordV13[] = [
  { pharmacistRoundCount: 50, prescriptionReviewCount: 300, medicationOrderAuditCount: 2000 },
  { pharmacistRoundCount: 50, prescriptionReviewCount: 300, medicationOrderAuditCount: 2000 },
];

describe("computeClinicalPharmacistRoundCountV13", () => {
  // 算式：50+50 = 100
  it("临床药师查房次数 = 100 次", () => {
    expect(computeClinicalPharmacistRoundCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeClinicalPharmacistRoundCountV13([])).toBe(0);
  });
});

describe("computePrescriptionReviewCountV13", () => {
  // 算式：300+300 = 600
  it("处方点评份数 = 600 份", () => {
    expect(computePrescriptionReviewCountV13(records)).toBe(600);
  });
});

describe("computeMedicationOrderAuditCountV13", () => {
  // 算式：2000+2000 = 4000
  it("用药医嘱审核数 = 4000 条", () => {
    expect(computeMedicationOrderAuditCountV13(records)).toBe(4000);
  });
});

describe("clinicalPharmacyV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pharmacy 路由存在且 auth:true", () => {
    const route = clinicalPharmacyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pharmacy",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
