/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 路由（M343-A）
 *
 * GET /api/v1/resident-training
 *
 * 权限：resident-training:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGraduationPassRateV13,
  computeMentorCountV13,
  computeResidentCountV13,
  type ResidentTrainingRecordV13,
} from "../aggregators/residentTrainingV13Aggregator.js";

const records: ResidentTrainingRecordV13[] = [
  { residentCount: 30, graduationTotal: 30, graduationPassed: 27, mentorCount: 10 },
  { residentCount: 20, graduationTotal: 20, graduationPassed: 18, mentorCount: 5 },
];

export const residentTrainingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/resident-training",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "resident-training:read");
      if (denied) return denied;
      return json(ok({
        residentCount: computeResidentCountV13(records),
        graduationPassRate: computeGraduationPassRateV13(records),
        mentorCount: computeMentorCountV13(records),
      }));
    },
  },
];
