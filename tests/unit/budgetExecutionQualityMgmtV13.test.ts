/**
 * 健澜科技 jlmedaios - 预算执行质量管理 V13 单测（M435-A，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBudgetDeviationRateV13,
  computeBudgetExecutionRateV13,
  computeCostControlRateV13,
  type BudgetExecutionQualityMgmtRecordV13,
} from "../../src/bff/aggregators/budgetExecutionQualityMgmtV13Aggregator";
import { budgetExecutionQualityMgmtV13Routes } from "../../src/bff/routes/budgetExecutionQualityMgmtV13";

const records: BudgetExecutionQualityMgmtRecordV13[] = [
  { executedBudget: 950, totalBudget: 1000, actualSpent: 980, budgetAmount: 1000, controlledCost: 900, budgetCost: 1000 },
  { executedBudget: 950, totalBudget: 1000, actualSpent: 980, budgetAmount: 1000, controlledCost: 900, budgetCost: 1000 },
];

describe("computeBudgetExecutionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("预算执行率 = 95.00%", () => {
    expect(computeBudgetExecutionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeBudgetExecutionRateV13([])).toBe(0);
  });
});

describe("computeBudgetDeviationRateV13", () => {
  // 算式：(|980-1000|+|980-1000|)/(1000+1000)×100 = (20+20)/2000×100 = 40/2000×100 = 2.00（反向，绝对值）
  it("预算偏差率 = 2.00%（反向，绝对值）", () => {
    expect(computeBudgetDeviationRateV13(records)).toBe(2.00);
  });
});

describe("computeCostControlRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00（反向，越低越好）
  it("成本控制率 = 90.00%（反向，越低越好）", () => {
    expect(computeCostControlRateV13(records)).toBe(90.00);
  });
});

describe("budgetExecutionQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/budget-execution-quality-mgmt 路由存在且 auth:true", () => {
    const route = budgetExecutionQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/budget-execution-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
