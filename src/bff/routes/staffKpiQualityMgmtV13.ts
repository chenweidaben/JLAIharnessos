/**
 * 健澜科技 jlmedaios - 个人 KPI 质量管理 V13 路由（M433-B，-quality 后缀避让旧版 staffKpiMgmtV13（M410））
 *
 * GET /api/v1/staff-kpi-quality-mgmt
 *
 * 权限：staff-kpi-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeStaffKpiAchievementRateV13,
  computeStaffKpiCompletionRateV13,
  computeStaffKpiExcellenceRateV13,
  type StaffKpiQualityMgmtRecordV13,
} from "../aggregators/staffKpiQualityMgmtV13Aggregator.js";

const records: StaffKpiQualityMgmtRecordV13[] = [
  { completedStaff: 950, shouldAssessStaff: 1000, achievedStaff: 980, assessedStaff: 1000, excellentStaff: 300 },
  { completedStaff: 950, shouldAssessStaff: 1000, achievedStaff: 980, assessedStaff: 1000, excellentStaff: 300 },
];

export const staffKpiQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-kpi-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-kpi-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        staffKpiCompletionRate: computeStaffKpiCompletionRateV13(records),
        staffKpiAchievementRate: computeStaffKpiAchievementRateV13(records),
        staffKpiExcellenceRate: computeStaffKpiExcellenceRateV13(records),
      }));
    },
  },
];
