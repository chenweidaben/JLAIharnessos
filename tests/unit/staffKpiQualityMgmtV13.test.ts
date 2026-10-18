/**
 * 健澜科技 jlmedaios - 个人 KPI 质量管理 V13 单测（M433-B，-quality 后缀避让旧版 staffKpiMgmtV13（M410））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeStaffKpiAchievementRateV13,
  computeStaffKpiCompletionRateV13,
  computeStaffKpiExcellenceRateV13,
  type StaffKpiQualityMgmtRecordV13,
} from "../../src/bff/aggregators/staffKpiQualityMgmtV13Aggregator";
import { staffKpiQualityMgmtV13Routes } from "../../src/bff/routes/staffKpiQualityMgmtV13";

const records: StaffKpiQualityMgmtRecordV13[] = [
  { completedStaff: 950, shouldAssessStaff: 1000, achievedStaff: 980, assessedStaff: 1000, excellentStaff: 300 },
  { completedStaff: 950, shouldAssessStaff: 1000, achievedStaff: 980, assessedStaff: 1000, excellentStaff: 300 },
];

describe("computeStaffKpiCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("个人 KPI 完成率 = 95.00%", () => {
    expect(computeStaffKpiCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeStaffKpiCompletionRateV13([])).toBe(0);
  });
});

describe("computeStaffKpiAchievementRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("个人 KPI 达标率 = 98.00%", () => {
    expect(computeStaffKpiAchievementRateV13(records)).toBe(98.00);
  });
});

describe("computeStaffKpiExcellenceRateV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00
  it("个人 KPI 优秀率 = 30.00%", () => {
    expect(computeStaffKpiExcellenceRateV13(records)).toBe(30.00);
  });
});

describe("staffKpiQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/staff-kpi-quality-mgmt 路由存在且 auth:true", () => {
    const route = staffKpiQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-kpi-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
