/**
 * 健澜科技 jlmedaios - 医生满意度调研 V13 路由（M332-B）
 *
 * GET /api/v1/doctor-satisfaction
 *
 * 权限：doctor-satisfaction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDoctorSatisfactionV13,
  type DoctorSatisfactionSurveyV13,
} from "../aggregators/doctorSatisfactionV13Aggregator.js";

const surveys: DoctorSatisfactionSurveyV13[] = [
  { salary: 3, workPressure: 4, careerDevelopment: 3 },
  { salary: 4, workPressure: 3, careerDevelopment: 4 },
  { salary: 5, workPressure: 4, careerDevelopment: 4 },
];

export const doctorSatisfactionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-satisfaction:read");
      if (denied) return denied;
      return json(ok({
        dimensions: computeDoctorSatisfactionV13(surveys),
      }));
    },
  },
];
