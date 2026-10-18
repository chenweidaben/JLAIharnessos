/**
 * 健澜科技 jlmedaios - 财务预算管理 V13 路由（M448-C，财务与收费管理组）
 *
 * GET /api/v1/budget-mgmt
 *
 * 权限：budget-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBudgetAdjustmentApprovalComplianceRateV13,
  computeBudgetDeviationRateV13,
  computeBudgetExecutionRateV13,
  type BudgetMgmtRecordV13,
} from "../aggregators/budgetMgmtV13Aggregator.js";

const records: BudgetMgmtRecordV13[] = [
  { executed: 950, totalBudget: 1000, actual: 980, budgetAmount: 1000, compliant: 900, totalAdjustment: 1000 },
  { executed: 950, totalBudget: 1000, actual: 980, budgetAmount: 1000, compliant: 900, totalAdjustment: 1000 },
];

export const budgetMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/budget-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "budget-mgmt:read");
      if (denied) return denied;
      return json(ok({
        budgetExecutionRate: computeBudgetExecutionRateV13(records),
        budgetDeviationRate: computeBudgetDeviationRateV13(records),
        budgetAdjustmentApprovalComplianceRate: computeBudgetAdjustmentApprovalComplianceRateV13(records),
      }));
    },
  },
];
