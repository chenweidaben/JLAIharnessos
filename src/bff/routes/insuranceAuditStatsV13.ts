/**
 * 健澜科技 jlmedaios - 医保审核统计 V13 路由（M382-B，stats 避让）
 *
 * GET /api/v1/insurance-audit-stats
 *
 * 权限：insurance-audit-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAuditDeductionAmountV13,
  computeInsuranceAuditCountV13,
  computeViolationCaseCountV13,
  type InsuranceAuditRecordV13,
} from "../aggregators/insuranceAuditStatsV13Aggregator.js";

const records: InsuranceAuditRecordV13[] = [
  { auditCount: 500, deductionAmount: 50000, violationCaseCount: 20 },
  { auditCount: 500, deductionAmount: 50000, violationCaseCount: 20 },
];

export const insuranceAuditStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-audit-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-audit-stats:read");
      if (denied) return denied;
      return json(ok({
        insuranceAuditCount: computeInsuranceAuditCountV13(records),
        auditDeductionAmount: computeAuditDeductionAmountV13(records),
        violationCaseCount: computeViolationCaseCountV13(records),
      }));
    },
  },
];
