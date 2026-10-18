/**
 * 健澜科技 jlmedaios - 科室 KPI 质量管理 V13 路由（M433-A，-quality 后缀避让旧版 deptKpiMgmtV13（M410））
 *
 * GET /api/v1/dept-kpi-quality-mgmt
 *
 * 权限：dept-kpi-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeptKpiAchievementRateV13,
  computeDeptKpiCompletionRateV13,
  computeDeptKpiImprovementRateV13,
  type DeptKpiQualityMgmtRecordV13,
} from "../aggregators/deptKpiQualityMgmtV13Aggregator.js";

const records: DeptKpiQualityMgmtRecordV13[] = [
  { completedItems: 950, shouldCompleteItems: 1000, achievedItems: 980, assessedItems: 1000, improvedItems: 900, baselineItems: 1000 },
  { completedItems: 950, shouldCompleteItems: 1000, achievedItems: 980, assessedItems: 1000, improvedItems: 900, baselineItems: 1000 },
];

export const deptKpiQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-kpi-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-kpi-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        deptKpiCompletionRate: computeDeptKpiCompletionRateV13(records),
        deptKpiAchievementRate: computeDeptKpiAchievementRateV13(records),
        deptKpiImprovementRate: computeDeptKpiImprovementRateV13(records),
      }));
    },
  },
];
