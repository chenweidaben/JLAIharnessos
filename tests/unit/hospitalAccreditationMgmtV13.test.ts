/**
 * 健澜科技 jlmedaios - 医院评审迎检管理 V13 单测（M452-A，医院评审与临床质量改进组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHospitalAccreditationClauseComplianceRateV13,
  computeHospitalAccreditationRectificationRateV13,
  computeHospitalAccreditationTaskCompletionRateV13,
  type HospitalAccreditationMgmtRecordV13,
} from "../../src/bff/aggregators/hospitalAccreditationMgmtV13Aggregator";
import { hospitalAccreditationMgmtV13Routes } from "../../src/bff/routes/hospitalAccreditationMgmtV13";

const records: HospitalAccreditationMgmtRecordV13[] = [
  { completed: 950, totalTask: 1000, qualified: 900, totalClause: 1000, rectified: 980, totalIssue: 1000 },
  { completed: 950, totalTask: 1000, qualified: 900, totalClause: 1000, rectified: 980, totalIssue: 1000 },
];

describe("computeHospitalAccreditationTaskCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("评审任务完成率 = 95.00%", () => {
    expect(computeHospitalAccreditationTaskCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHospitalAccreditationTaskCompletionRateV13([])).toBe(0);
  });
});

describe("computeHospitalAccreditationClauseComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("评审条款达标率 = 90.00%", () => {
    expect(computeHospitalAccreditationClauseComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeHospitalAccreditationRectificationRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("评审问题整改率 = 98.00%", () => {
    expect(computeHospitalAccreditationRectificationRateV13(records)).toBe(98.00);
  });
});

describe("hospitalAccreditationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/hospital-accreditation-mgmt 路由存在且 auth:true", () => {
    const route = hospitalAccreditationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hospital-accreditation-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
