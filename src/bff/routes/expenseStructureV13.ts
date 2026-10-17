/**
 * 健澜科技 jlmedaios - 收入结构（支出端） V13 路由（M356-D，M356 收官，expense 避让已有 revenueStructureV13 / revenueStructureStatsV13）
 *
 * GET /api/v1/expense-structure
 *
 * 权限：expense-structure:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalServiceRevenueRatioV13,
  computePersonnelExpenseRatioV13,
  computePropertyMaterialCostRatioV13,
  type ExpenseStructureRecordV13,
} from "../aggregators/expenseStructureV13Aggregator.js";

const records: ExpenseStructureRecordV13[] = [
  { medicalServiceRevenue: 4000, totalRevenue: 10000, personnelExpense: 2000, totalExpense: 8000, propertyMaterialCost: 1500 },
  { medicalServiceRevenue: 4000, totalRevenue: 10000, personnelExpense: 3000, totalExpense: 12000, propertyMaterialCost: 2500 },
];

export const expenseStructureV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/expense-structure",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "expense-structure:read");
      if (denied) return denied;
      return json(ok({
        medicalServiceRevenueRatio: computeMedicalServiceRevenueRatioV13(records),
        personnelExpenseRatio: computePersonnelExpenseRatioV13(records),
        propertyMaterialCostRatio: computePropertyMaterialCostRatioV13(records),
      }));
    },
  },
];
