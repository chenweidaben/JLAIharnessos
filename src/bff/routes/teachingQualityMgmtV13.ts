/**
 * 健澜科技 jlmedaios - 教学质量管理 V13 路由（M434-A，-quality 后缀避让旧版 trainingMgmtDetailV13（M419））
 *
 * GET /api/v1/teaching-quality-mgmt
 *
 * 权限：teaching-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTeachingPlanCompletionRateV13,
  computeTeachingStudentSatisfactionRateV13,
  computeTeachingTeacherPassRateV13,
  type TeachingQualityMgmtRecordV13,
} from "../aggregators/teachingQualityMgmtV13Aggregator.js";

const records: TeachingQualityMgmtRecordV13[] = [
  { completedPlans: 950, totalPlans: 1000, qualifiedTeachers: 980, totalTeachers: 1000, satisfiedStudents: 920, surveyedStudents: 1000 },
  { completedPlans: 950, totalPlans: 1000, qualifiedTeachers: 980, totalTeachers: 1000, satisfiedStudents: 920, surveyedStudents: 1000 },
];

export const teachingQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        teachingPlanCompletionRate: computeTeachingPlanCompletionRateV13(records),
        teachingTeacherPassRate: computeTeachingTeacherPassRateV13(records),
        teachingStudentSatisfactionRate: computeTeachingStudentSatisfactionRateV13(records),
      }));
    },
  },
];
