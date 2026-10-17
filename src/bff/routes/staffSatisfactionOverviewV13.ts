/**
 * 健澜科技 jlmedaios - 员工满意度总览 V13 路由（M332-D）
 *
 * GET /api/v1/staff-satisfaction-overview
 *
 * 权限：staff-satisfaction-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOverallStaffScoreV13,
  rankDepartmentsByScoreV13,
  type StaffSatisfactionSurveyV13,
} from "../aggregators/staffSatisfactionOverviewV13Aggregator.js";

const surveys: StaffSatisfactionSurveyV13[] = [
  { department: "心内科", score: 4.0 },
  { department: "骨科", score: 3.5 },
  { department: "神经内科", score: 4.5 },
];

export const staffSatisfactionOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-satisfaction-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-satisfaction-overview:read");
      if (denied) return denied;
      return json(ok({
        overallScore: computeOverallStaffScoreV13(surveys),
        departmentRanking: rankDepartmentsByScoreV13(surveys),
      }));
    },
  },
];
