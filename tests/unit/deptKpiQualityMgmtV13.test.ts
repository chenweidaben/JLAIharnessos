/**
 * 健澜科技 jlmedaios - 科室 KPI 质量管理 V13 单测（M433-A，-quality 后缀避让旧版 deptKpiMgmtV13（M410））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeptKpiAchievementRateV13,
  computeDeptKpiCompletionRateV13,
  computeDeptKpiImprovementRateV13,
  type DeptKpiQualityMgmtRecordV13,
} from "../../src/bff/aggregators/deptKpiQualityMgmtV13Aggregator";
import { deptKpiQualityMgmtV13Routes } from "../../src/bff/routes/deptKpiQualityMgmtV13";

const records: DeptKpiQualityMgmtRecordV13[] = [
  { completedItems: 950, shouldCompleteItems: 1000, achievedItems: 980, assessedItems: 1000, improvedItems: 900, baselineItems: 1000 },
  { completedItems: 950, shouldCompleteItems: 1000, achievedItems: 980, assessedItems: 1000, improvedItems: 900, baselineItems: 1000 },
];

describe("computeDeptKpiCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("科室 KPI 完成率 = 95.00%", () => {
    expect(computeDeptKpiCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDeptKpiCompletionRateV13([])).toBe(0);
  });
});

describe("computeDeptKpiAchievementRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("科室 KPI 达标率 = 98.00%", () => {
    expect(computeDeptKpiAchievementRateV13(records)).toBe(98.00);
  });
});

describe("computeDeptKpiImprovementRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("科室 KPI 改进率 = 90.00%", () => {
    expect(computeDeptKpiImprovementRateV13(records)).toBe(90.00);
  });
});

describe("deptKpiQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/dept-kpi-quality-mgmt 路由存在且 auth:true", () => {
    const route = deptKpiQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-kpi-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
