/**
 * 健澜科技 jlmedaios - 绩效奖金 V13 单测（M410-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBonusDistributionFairnessScoreV13,
  computePerCapitaPerformanceBonusV13,
  computePerformanceBonusRatioV13,
  type PerformanceBonusRecordV13,
} from "../../src/bff/aggregators/performanceBonusV13Aggregator";
import { performanceBonusV13Routes } from "../../src/bff/routes/performanceBonusV13";

const records: PerformanceBonusRecordV13[] = [
  { perCapitaBonus: 5000.5, bonusTotal: 300, salaryTotal: 1000, fairnessScore: 85.5 },
  { perCapitaBonus: 5000.5, bonusTotal: 300, salaryTotal: 1000, fairnessScore: 85.5 },
];

describe("computePerCapitaPerformanceBonusV13", () => {
  // 算式：(5000.5+5000.5)/2 = 5000.50
  it("人均绩效奖金 = 5000.50 元", () => {
    expect(computePerCapitaPerformanceBonusV13(records)).toBe(5000.50);
  });
  it("空态 → 0", () => {
    expect(computePerCapitaPerformanceBonusV13([])).toBe(0);
  });
});

describe("computePerformanceBonusRatioV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00
  it("绩效奖金占比 = 30.00%", () => {
    expect(computePerformanceBonusRatioV13(records)).toBe(30.00);
  });
});

describe("computeBonusDistributionFairnessScoreV13", () => {
  // 算式：(85.5+85.5)/2 = 85.50
  it("奖金分配公平性评分 = 85.50", () => {
    expect(computeBonusDistributionFairnessScoreV13(records)).toBe(85.50);
  });
});

describe("performanceBonusV13Routes 读路由", () => {
  it("GET /api/v1/performance-bonus 路由存在且 auth:true", () => {
    const route = performanceBonusV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-bonus",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
