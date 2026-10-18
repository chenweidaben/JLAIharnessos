/**
 * 健澜科技 jlmedaios - 绩效考核管理 V13 单测（M444-A，绩效薪酬与人力资源管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePerformanceAppraisalDeptQualifiedRateV13,
  computePerformanceAppraisalResultApplicationRateV13,
  computePerformanceAppraisalStaffExcellentRateV13,
  type PerformanceAppraisalMgmtRecordV13,
} from "../../src/bff/aggregators/performanceAppraisalMgmtV13Aggregator";
import { performanceAppraisalMgmtV13Routes } from "../../src/bff/routes/performanceAppraisalMgmtV13";

const records: PerformanceAppraisalMgmtRecordV13[] = [
  { deptQualified: 950, deptTotal: 1000, staffExcellent: 900, staffTotal: 1000, resultApplied: 980, shouldApply: 1000 },
  { deptQualified: 950, deptTotal: 1000, staffExcellent: 900, staffTotal: 1000, resultApplied: 980, shouldApply: 1000 },
];

describe("computePerformanceAppraisalDeptQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("科室考核合格率 = 95.00%", () => {
    expect(computePerformanceAppraisalDeptQualifiedRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePerformanceAppraisalDeptQualifiedRateV13([])).toBe(0);
  });
});

describe("computePerformanceAppraisalStaffExcellentRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("个人考核优秀率 = 90.00%", () => {
    expect(computePerformanceAppraisalStaffExcellentRateV13(records)).toBe(90.00);
  });
});

describe("computePerformanceAppraisalResultApplicationRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("考核结果应用率 = 98.00%", () => {
    expect(computePerformanceAppraisalResultApplicationRateV13(records)).toBe(98.00);
  });
});

describe("performanceAppraisalMgmtV13Routes 读路由", () => {
  it("GET /api/v1/performance-appraisal-mgmt 路由存在且 auth:true", () => {
    const route = performanceAppraisalMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-appraisal-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
