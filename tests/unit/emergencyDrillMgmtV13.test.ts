/**
 * 健澜科技 jlmedaios - 应急演练管理 V13 单测（M447-A，应急管理与安全生产管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyDrillAssessmentQualifiedRateV13,
  computeEmergencyDrillPlanCompletionRateV13,
  computeEmergencyDrillSubjectCoverageRateV13,
  type EmergencyDrillMgmtRecordV13,
} from "../../src/bff/aggregators/emergencyDrillMgmtV13Aggregator";
import { emergencyDrillMgmtV13Routes } from "../../src/bff/routes/emergencyDrillMgmtV13";

const records: EmergencyDrillMgmtRecordV13[] = [
  { completedDrill: 950, plannedDrill: 1000, coveredSubject: 900, totalSubject: 1000, qualifiedDrill: 980, totalDrill: 1000 },
  { completedDrill: 950, plannedDrill: 1000, coveredSubject: 900, totalSubject: 1000, qualifiedDrill: 980, totalDrill: 1000 },
];

describe("computeEmergencyDrillPlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("年度演练计划完成率 = 95.00%", () => {
    expect(computeEmergencyDrillPlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyDrillPlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeEmergencyDrillSubjectCoverageRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("演练科目覆盖率 = 90.00%", () => {
    expect(computeEmergencyDrillSubjectCoverageRateV13(records)).toBe(90.00);
  });
});

describe("computeEmergencyDrillAssessmentQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("演练评估合格率 = 98.00%", () => {
    expect(computeEmergencyDrillAssessmentQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("emergencyDrillMgmtV13Routes 读路由", () => {
  it("GET /api/v1/emergency-drill-mgmt 路由存在且 auth:true", () => {
    const route = emergencyDrillMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-drill-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
