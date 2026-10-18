/**
 * 健澜科技 jlmedaios - 财务预算管理 V13 单测（M448-C，财务与收费管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBudgetAdjustmentApprovalComplianceRateV13,
  computeBudgetDeviationRateV13,
  computeBudgetExecutionRateV13,
  type BudgetMgmtRecordV13,
} from "../../src/bff/aggregators/budgetMgmtV13Aggregator";
import { budgetMgmtV13Routes } from "../../src/bff/routes/budgetMgmtV13";

const records: BudgetMgmtRecordV13[] = [
  { executed: 950, totalBudget: 1000, actual: 980, budgetAmount: 1000, compliant: 900, totalAdjustment: 1000 },
  { executed: 950, totalBudget: 1000, actual: 980, budgetAmount: 1000, compliant: 900, totalAdjustment: 1000 },
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
  // 算式：|(980+980)-(1000+1000)|/(1000+1000)×100 = |1960-2000|/2000×100 = 40/2000×100 = 2.00（反向，越低越好）
  it("预算偏差率 = 2.00%（反向，越低越好）", () => {
    expect(computeBudgetDeviationRateV13(records)).toBe(2.00);
  });
});

describe("computeBudgetAdjustmentApprovalComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("预算调整审批合规率 = 90.00%", () => {
    expect(computeBudgetAdjustmentApprovalComplianceRateV13(records)).toBe(90.00);
  });
});

describe("budgetMgmtV13Routes 读路由", () => {
  it("GET /api/v1/budget-mgmt 路由存在且 auth:true", () => {
    const route = budgetMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/budget-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
