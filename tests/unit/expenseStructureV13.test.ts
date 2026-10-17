/**
 * 健澜科技 jlmedaios - 收入结构（支出端） V13 单测（M356-D，M356 收官，expense 避让已有 revenueStructureV13 / revenueStructureStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalServiceRevenueRatioV13,
  computePersonnelExpenseRatioV13,
  computePropertyMaterialCostRatioV13,
  type ExpenseStructureRecordV13,
} from "../../src/bff/aggregators/expenseStructureV13Aggregator";
import { expenseStructureV13Routes } from "../../src/bff/routes/expenseStructureV13";

const records: ExpenseStructureRecordV13[] = [
  { medicalServiceRevenue: 4000, totalRevenue: 10000, personnelExpense: 2000, totalExpense: 8000, propertyMaterialCost: 1500 },
  { medicalServiceRevenue: 4000, totalRevenue: 10000, personnelExpense: 3000, totalExpense: 12000, propertyMaterialCost: 2500 },
];

describe("computeMedicalServiceRevenueRatioV13", () => {
  // 算式：(4000+4000)/(10000+10000) = 8000/20000×100 = 40.00
  it("医疗服务收入占比 = 40.00%", () => {
    expect(computeMedicalServiceRevenueRatioV13(records)).toBe(40.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalServiceRevenueRatioV13([])).toBe(0);
  });
});

describe("computePersonnelExpenseRatioV13", () => {
  // 算式：(2000+3000)/(8000+12000) = 5000/20000×100 = 25.00
  it("人员支出占比 = 25.00%", () => {
    expect(computePersonnelExpenseRatioV13(records)).toBe(25.00);
  });
});

describe("computePropertyMaterialCostRatioV13", () => {
  // 算式：(1500+2500)/(8000+12000) = 4000/20000×100 = 20.00
  it("财产物资消耗占比 = 20.00%", () => {
    expect(computePropertyMaterialCostRatioV13(records)).toBe(20.00);
  });
});

describe("expenseStructureV13Routes 读路由", () => {
  it("GET /api/v1/expense-structure 路由存在且 auth:true", () => {
    const route = expenseStructureV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/expense-structure",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
