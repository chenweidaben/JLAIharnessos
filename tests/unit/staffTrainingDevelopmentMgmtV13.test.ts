/**
 * 健澜科技 jlmedaios - 员工培训发展管理 V13 单测（M444-D，M444 收官，绩效薪酬与人力资源管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeStaffTrainingDevelopmentExamPassRateV13,
  computeStaffTrainingDevelopmentPlanCompletionRateV13,
  computeStaffTrainingDevelopmentPromotionRateV13,
  type StaffTrainingDevelopmentMgmtRecordV13,
} from "../../src/bff/aggregators/staffTrainingDevelopmentMgmtV13Aggregator";
import { staffTrainingDevelopmentMgmtV13Routes } from "../../src/bff/routes/staffTrainingDevelopmentMgmtV13";

const records: StaffTrainingDevelopmentMgmtRecordV13[] = [
  { completedTraining: 950, plannedTraining: 1000, examPassed: 900, examReferenced: 1000, promoted: 980, eligible: 1000 },
  { completedTraining: 950, plannedTraining: 1000, examPassed: 900, examReferenced: 1000, promoted: 980, eligible: 1000 },
];

describe("computeStaffTrainingDevelopmentPlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("培训计划完成率 = 95.00%", () => {
    expect(computeStaffTrainingDevelopmentPlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeStaffTrainingDevelopmentPlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeStaffTrainingDevelopmentExamPassRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("培训考核合格率 = 90.00%", () => {
    expect(computeStaffTrainingDevelopmentExamPassRateV13(records)).toBe(90.00);
  });
});

describe("computeStaffTrainingDevelopmentPromotionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("职称晋升率 = 98.00%", () => {
    expect(computeStaffTrainingDevelopmentPromotionRateV13(records)).toBe(98.00);
  });
});

describe("staffTrainingDevelopmentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/staff-training-development-mgmt 路由存在且 auth:true", () => {
    const route = staffTrainingDevelopmentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-training-development-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
