/**
 * 健澜科技 jlmedaios - 教学管理 V13 路由（M361-B）
 *
 * GET /api/v1/teaching-mgmt
 *
 * 权限：teaching-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeStudentSatisfactionV13,
  computeTeacherQualificationPassRateV13,
  computeTeachingHoursCompletionRateV13,
  type TeachingMgmtRecordV13,
} from "../aggregators/teachingMgmtV13Aggregator.js";

const records: TeachingMgmtRecordV13[] = [
  { completedHours: 950, plannedHours: 1000, qualifiedTeachers: 48, teacherCount: 50, studentSatisfaction: 95 },
  { completedHours: 950, plannedHours: 1000, qualifiedTeachers: 47, teacherCount: 50, studentSatisfaction: 97 },
];

export const teachingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-mgmt:read");
      if (denied) return denied;
      return json(ok({
        teachingHoursCompletionRate: computeTeachingHoursCompletionRateV13(records),
        teacherQualificationPassRate: computeTeacherQualificationPassRateV13(records),
        studentSatisfaction: computeStudentSatisfactionV13(records),
      }));
    },
  },
];
