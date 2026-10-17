/**
 * 健澜科技 jlmedaios - 员工满意度 V13 路由（M322-C）
 *
 * GET /api/v1/staff-satisfaction
 *
 * 权限：staff-satisfaction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStaffSatisfactionOverviewV13,
  type StaffSurveyV13,
} from "../aggregators/staffSatisfactionV13Aggregator.js";

const surveys: StaffSurveyV13[] = [
  { surveyId: "s1", group: "doctor", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s2", group: "doctor", satisfaction: 5, intendsToLeave: true },
  { surveyId: "s3", group: "doctor", satisfaction: 3, intendsToLeave: false },
  { surveyId: "s4", group: "nurse", satisfaction: 3, intendsToLeave: false },
  { surveyId: "s5", group: "nurse", satisfaction: 4, intendsToLeave: true },
  { surveyId: "s6", group: "nurse", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s7", group: "admin", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s8", group: "admin", satisfaction: 5, intendsToLeave: false },
  { surveyId: "s9", group: "doctor", satisfaction: 4, intendsToLeave: false },
  { surveyId: "s10", group: "nurse", satisfaction: 3, intendsToLeave: false },
];

export const staffSatisfactionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-satisfaction:read");
      if (denied) return denied;
      return json(ok(buildStaffSatisfactionOverviewV13(surveys)));
    },
  },
];
