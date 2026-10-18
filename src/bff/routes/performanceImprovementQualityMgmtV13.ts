/**
 * 健澜科技 jlmedaios - 绩效改进质量管理 V13 路由（M433-D，M433 收官，-quality 后缀避让旧版 performanceImprovementMgmtV13（M410））
 *
 * GET /api/v1/performance-improvement-quality-mgmt
 *
 * 权限：performance-improvement-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePerformanceImprovementBenefitRateV13,
  computePerformanceImprovementCompletionRateV13,
  computePerformanceImprovementProjectCountV13,
  type PerformanceImprovementQualityMgmtRecordV13,
} from "../aggregators/performanceImprovementQualityMgmtV13Aggregator.js";

const records: PerformanceImprovementQualityMgmtRecordV13[] = [
  { projectCount: 5, completedProjects: 950, initiatedProjects: 1000, benefitProjects: 800 },
  { projectCount: 5, completedProjects: 950, initiatedProjects: 1000, benefitProjects: 800 },
];

export const performanceImprovementQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-improvement-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-improvement-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        performanceImprovementProjectCount: computePerformanceImprovementProjectCountV13(records),
        performanceImprovementCompletionRate: computePerformanceImprovementCompletionRateV13(records),
        performanceImprovementBenefitRate: computePerformanceImprovementBenefitRateV13(records),
      }));
    },
  },
];
