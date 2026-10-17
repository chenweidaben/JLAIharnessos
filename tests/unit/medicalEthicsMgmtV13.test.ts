/**
 * 健澜科技 jlmedaios - 医学伦理管理 V13 单测（M420-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEthicsConsultationResponseRateV13,
  computeEthicsReviewProjectCountV13,
  computeSubjectProtectionComplianceRateV13,
  type MedicalEthicsMgmtRecordV13,
} from "../../src/bff/aggregators/medicalEthicsMgmtV13Aggregator";
import { medicalEthicsMgmtV13Routes } from "../../src/bff/routes/medicalEthicsMgmtV13";

const records: MedicalEthicsMgmtRecordV13[] = [
  { reviewProjects: 20, consultationResponded: 980, consultationTotal: 1000, subjectProtectionCompliant: 950, reviewProjectTotal: 1000 },
  { reviewProjects: 30, consultationResponded: 980, consultationTotal: 1000, subjectProtectionCompliant: 950, reviewProjectTotal: 1000 },
];

describe("computeEthicsReviewProjectCountV13", () => {
  // 算式：20+30 = 50 项（整数求和，不是百分比）
  it("伦理审查项目数 = 50 项（整数求和）", () => {
    expect(computeEthicsReviewProjectCountV13(records)).toBe(50);
  });
  it("空态 → 0", () => {
    expect(computeEthicsReviewProjectCountV13([])).toBe(0);
  });
});

describe("computeEthicsConsultationResponseRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("伦理咨询响应率 = 98.00%", () => {
    expect(computeEthicsConsultationResponseRateV13(records)).toBe(98.00);
  });
});

describe("computeSubjectProtectionComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("受试者保护合规率 = 95.00%", () => {
    expect(computeSubjectProtectionComplianceRateV13(records)).toBe(95.00);
  });
});

describe("medicalEthicsMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-ethics-mgmt 路由存在且 auth:true", () => {
    const route = medicalEthicsMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-ethics-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
