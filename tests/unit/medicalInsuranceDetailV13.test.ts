/**
 * 健澜科技 jlmedaios - 医保管理明细 V13 单测（M398-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalInsuranceAssessmentScoreV13,
  computeMedicalInsuranceAuditDeductionV13,
  computeMedicalInsuranceRejectionAmountV13,
  type MedicalInsuranceDetailRecordV13,
} from "../../src/bff/aggregators/medicalInsuranceDetailV13Aggregator";
import { medicalInsuranceDetailV13Routes } from "../../src/bff/routes/medicalInsuranceDetailV13";

const records: MedicalInsuranceDetailRecordV13[] = [
  { rejectionAmount: 10000, auditDeduction: 5000, assessmentScore: 90 },
  { rejectionAmount: 10000, auditDeduction: 5000, assessmentScore: 90 },
];

describe("computeMedicalInsuranceRejectionAmountV13", () => {
  // 算式：10000+10000 = 20000
  it("医保拒付金额 = 20000 元", () => {
    expect(computeMedicalInsuranceRejectionAmountV13(records)).toBe(20000);
  });
  it("空态 → 0", () => {
    expect(computeMedicalInsuranceRejectionAmountV13([])).toBe(0);
  });
});

describe("computeMedicalInsuranceAuditDeductionV13", () => {
  // 算式：5000+5000 = 10000
  it("医保稽核扣款 = 10000 元", () => {
    expect(computeMedicalInsuranceAuditDeductionV13(records)).toBe(10000);
  });
});

describe("computeMedicalInsuranceAssessmentScoreV13", () => {
  // 算式：(90+90)/2 = 90.00
  it("医保考核得分 = 90.00 分", () => {
    expect(computeMedicalInsuranceAssessmentScoreV13(records)).toBe(90.00);
  });
});

describe("medicalInsuranceDetailV13Routes 读路由", () => {
  it("GET /api/v1/medical-insurance-detail 路由存在且 auth:true", () => {
    const route = medicalInsuranceDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-insurance-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
