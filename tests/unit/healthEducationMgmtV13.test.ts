/**
 * 健澜科技 jlmedaios - 健康教育管理 V13 单测（M420-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHealthConsultationCoverageRateV13,
  computeHealthEducationPrescriptionIssueRateV13,
  computeHealthLectureSessionCountV13,
  type HealthEducationMgmtRecordV13,
} from "../../src/bff/aggregators/healthEducationMgmtV13Aggregator";
import { healthEducationMgmtV13Routes } from "../../src/bff/routes/healthEducationMgmtV13";

const records: HealthEducationMgmtRecordV13[] = [
  { prescriptionIssued: 950, prescriptionShouldIssue: 1000, lectureSessions: 12, consultationCovered: 980, consultationShouldCover: 1000 },
  { prescriptionIssued: 950, prescriptionShouldIssue: 1000, lectureSessions: 18, consultationCovered: 980, consultationShouldCover: 1000 },
];

describe("computeHealthEducationPrescriptionIssueRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("健康教育处方发放率 = 95.00%", () => {
    expect(computeHealthEducationPrescriptionIssueRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHealthEducationPrescriptionIssueRateV13([])).toBe(0);
  });
});

describe("computeHealthLectureSessionCountV13", () => {
  // 算式：12+18 = 30 场（整数求和，不是百分比）
  it("健康讲座场次 = 30 场（整数求和）", () => {
    expect(computeHealthLectureSessionCountV13(records)).toBe(30);
  });
});

describe("computeHealthConsultationCoverageRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("健康咨询覆盖率 = 98.00%", () => {
    expect(computeHealthConsultationCoverageRateV13(records)).toBe(98.00);
  });
});

describe("healthEducationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/health-education-mgmt 路由存在且 auth:true", () => {
    const route = healthEducationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/health-education-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
