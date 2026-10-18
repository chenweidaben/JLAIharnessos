/**
 * 健澜科技 jlmedaios - 薪酬分配管理 V13 路由（M444-B，绩效薪酬与人力资源管理组）
 *
 * GET /api/v1/salary-distribution-mgmt
 *
 * 权限：salary-distribution-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSalaryDistributionComplianceRateV13,
  computeSalaryDistributionSatisfactionRateV13,
  computeSalaryDistributionTimelinessRateV13,
  type SalaryDistributionMgmtRecordV13,
} from "../aggregators/salaryDistributionMgmtV13Aggregator.js";

const records: SalaryDistributionMgmtRecordV13[] = [
  { timelyPaid: 950, shouldPay: 1000, compliantPlan: 900, totalPlan: 1000, satisfiedStaff: 980, surveyedStaff: 1000 },
  { timelyPaid: 950, shouldPay: 1000, compliantPlan: 900, totalPlan: 1000, satisfiedStaff: 980, surveyedStaff: 1000 },
];

export const salaryDistributionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/salary-distribution-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "salary-distribution-mgmt:read");
      if (denied) return denied;
      return json(ok({
        salaryDistributionTimelinessRate: computeSalaryDistributionTimelinessRateV13(records),
        salaryDistributionComplianceRate: computeSalaryDistributionComplianceRateV13(records),
        salaryDistributionSatisfactionRate: computeSalaryDistributionSatisfactionRateV13(records),
      }));
    },
  },
];
