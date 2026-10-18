/**
 * 健澜科技 jlmedaios - 医德医风质量管理 V13 单测（M438-A，行风廉洁与职业道德建设组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalEthicsComplaintResolutionTimelinessRateV13,
  computeMedicalEthicsEvaluationPassRateV13,
  computeMedicalEthicsPatientSatisfactionRateV13,
  type MedicalEthicsQualityMgmtRecordV13,
} from "../../src/bff/aggregators/medicalEthicsQualityMgmtV13Aggregator";
import { medicalEthicsQualityMgmtV13Routes } from "../../src/bff/routes/medicalEthicsQualityMgmtV13";

const records: MedicalEthicsQualityMgmtRecordV13[] = [
  { qualifiedEvaluation: 950, totalEvaluation: 1000, satisfiedPatients: 920, surveyedPatients: 1000, timelyResolved: 950, totalComplaints: 1000 },
  { qualifiedEvaluation: 950, totalEvaluation: 1000, satisfiedPatients: 920, surveyedPatients: 1000, timelyResolved: 950, totalComplaints: 1000 },
];

describe("computeMedicalEthicsEvaluationPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("医德考评合格率 = 95.00%", () => {
    expect(computeMedicalEthicsEvaluationPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalEthicsEvaluationPassRateV13([])).toBe(0);
  });
});

describe("computeMedicalEthicsPatientSatisfactionRateV13", () => {
  // 算式：(920+920)/(1000+1000)×100 = 1840/2000×100 = 92.00
  it("患者满意度 = 92.00%", () => {
    expect(computeMedicalEthicsPatientSatisfactionRateV13(records)).toBe(92.00);
  });
});

describe("computeMedicalEthicsComplaintResolutionTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("投诉处理及时率 = 95.00%", () => {
    expect(computeMedicalEthicsComplaintResolutionTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("medicalEthicsQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-ethics-quality-mgmt 路由存在且 auth:true", () => {
    const route = medicalEthicsQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-ethics-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
