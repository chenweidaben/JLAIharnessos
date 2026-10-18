/**
 * 健澜科技 jlmedaios - 预算执行质量管理 V13 路由（M435-A，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
 *
 * GET /api/v1/budget-execution-quality-mgmt
 *
 * 权限：budget-execution-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBudgetDeviationRateV13,
  computeBudgetExecutionRateV13,
  computeCostControlRateV13,
  type BudgetExecutionQualityMgmtRecordV13,
} from "../aggregators/budgetExecutionQualityMgmtV13Aggregator.js";

const records: BudgetExecutionQualityMgmtRecordV13[] = [
  { executedBudget: 950, totalBudget: 1000, actualSpent: 980, budgetAmount: 1000, controlledCost: 900, budgetCost: 1000 },
  { executedBudget: 950, totalBudget: 1000, actualSpent: 980, budgetAmount: 1000, controlledCost: 900, budgetCost: 1000 },
];

export const budgetExecutionQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/budget-execution-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "budget-execution-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        budgetExecutionRate: computeBudgetExecutionRateV13(records),
        budgetDeviationRate: computeBudgetDeviationRateV13(records),
        costControlRate: computeCostControlRateV13(records),
      }));
    },
  },
];
