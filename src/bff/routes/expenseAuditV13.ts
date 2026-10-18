/**
 * 健澜科技 jlmedaios - 医疗费用审核 V13 路由（M445-C，医保物价与费用管理组）
 *
 * GET /api/v1/expense-audit
 *
 * 权限：expense-audit:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeExpenseAuditAppealSuccessRateV13,
  computeExpenseAuditDischargeRecordRateV13,
  computeExpenseAuditUnreasonableProportionRateV13,
  type ExpenseAuditRecordV13,
} from "../aggregators/expenseAuditV13Aggregator.js";

const records: ExpenseAuditRecordV13[] = [
  { audited: 950, totalDischarge: 1000, unreasonableAmount: 50, totalAuditedAmount: 10000, appealSuccess: 900, totalAppeal: 1000 },
  { audited: 950, totalDischarge: 1000, unreasonableAmount: 50, totalAuditedAmount: 10000, appealSuccess: 900, totalAppeal: 1000 },
];

export const expenseAuditV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/expense-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "expense-audit:read");
      if (denied) return denied;
      return json(ok({
        expenseAuditDischargeRecordRate: computeExpenseAuditDischargeRecordRateV13(records),
        expenseAuditUnreasonableProportionRate: computeExpenseAuditUnreasonableProportionRateV13(records),
        expenseAuditAppealSuccessRate: computeExpenseAuditAppealSuccessRateV13(records),
      }));
    },
  },
];
