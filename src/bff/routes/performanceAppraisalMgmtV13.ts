/**
 * 健澜科技 jlmedaios - 绩效考核管理 V13 路由（M444-A，绩效薪酬与人力资源管理组）
 *
 * GET /api/v1/performance-appraisal-mgmt
 *
 * 权限：performance-appraisal-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePerformanceAppraisalDeptQualifiedRateV13,
  computePerformanceAppraisalResultApplicationRateV13,
  computePerformanceAppraisalStaffExcellentRateV13,
  type PerformanceAppraisalMgmtRecordV13,
} from "../aggregators/performanceAppraisalMgmtV13Aggregator.js";

const records: PerformanceAppraisalMgmtRecordV13[] = [
  { deptQualified: 950, deptTotal: 1000, staffExcellent: 900, staffTotal: 1000, resultApplied: 980, shouldApply: 1000 },
  { deptQualified: 950, deptTotal: 1000, staffExcellent: 900, staffTotal: 1000, resultApplied: 980, shouldApply: 1000 },
];

export const performanceAppraisalMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-appraisal-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-appraisal-mgmt:read");
      if (denied) return denied;
      return json(ok({
        performanceAppraisalDeptQualifiedRate: computePerformanceAppraisalDeptQualifiedRateV13(records),
        performanceAppraisalStaffExcellentRate: computePerformanceAppraisalStaffExcellentRateV13(records),
        performanceAppraisalResultApplicationRate: computePerformanceAppraisalResultApplicationRateV13(records),
      }));
    },
  },
];
