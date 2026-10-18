/**
 * 健澜科技 jlmedaios - 绩效改进质量管理 V13 单测（M433-D，M433 收官，-quality 后缀避让旧版 performanceImprovementMgmtV13（M410））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePerformanceImprovementBenefitRateV13,
  computePerformanceImprovementCompletionRateV13,
  computePerformanceImprovementProjectCountV13,
  type PerformanceImprovementQualityMgmtRecordV13,
} from "../../src/bff/aggregators/performanceImprovementQualityMgmtV13Aggregator";
import { performanceImprovementQualityMgmtV13Routes } from "../../src/bff/routes/performanceImprovementQualityMgmtV13";

const records: PerformanceImprovementQualityMgmtRecordV13[] = [
  { projectCount: 5, completedProjects: 950, initiatedProjects: 1000, benefitProjects: 800 },
  { projectCount: 5, completedProjects: 950, initiatedProjects: 1000, benefitProjects: 800 },
];

describe("computePerformanceImprovementProjectCountV13", () => {
  // 算式：5 + 5 = 10 个（整数求和类）
  it("绩效改进项目数 = 10 个（整数求和类）", () => {
    expect(computePerformanceImprovementProjectCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computePerformanceImprovementProjectCountV13([])).toBe(0);
  });
});

describe("computePerformanceImprovementCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("绩效改进完成率 = 95.00%", () => {
    expect(computePerformanceImprovementCompletionRateV13(records)).toBe(95.00);
  });
});

describe("computePerformanceImprovementBenefitRateV13", () => {
  // 算式：(800+800)/(950+950)×100 = 1600/1900×100 = 84.21（精确：1600/1900=0.842105...×100=84.21）
  it("绩效改进效益率 = 84.21%", () => {
    expect(computePerformanceImprovementBenefitRateV13(records)).toBe(84.21);
  });
});

describe("performanceImprovementQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/performance-improvement-quality-mgmt 路由存在且 auth:true", () => {
    const route = performanceImprovementQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-improvement-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
