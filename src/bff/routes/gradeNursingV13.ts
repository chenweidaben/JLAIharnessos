/**
 * 健澜科技 jlmedaios - 分级护理 V13 路由（M404-D，M404 收官）
 *
 * GET /api/v1/grade-nursing
 *
 * 权限：grade-nursing:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFirstGradeNursingPassRateV13,
  computeNursingRoundsArrivalRateV13,
  computeSpecialGradeNursingPassRateV13,
  type GradeNursingRecordV13,
} from "../aggregators/gradeNursingV13Aggregator.js";

const records: GradeNursingRecordV13[] = [
  { specialPass: 980, specialTotal: 1000, firstPass: 950, firstTotal: 1000, roundsArrived: 990, roundsTotal: 1000 },
  { specialPass: 980, specialTotal: 1000, firstPass: 950, firstTotal: 1000, roundsArrived: 990, roundsTotal: 1000 },
];

export const gradeNursingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/grade-nursing",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "grade-nursing:read");
      if (denied) return denied;
      return json(ok({
        specialGradeNursingPassRate: computeSpecialGradeNursingPassRateV13(records),
        firstGradeNursingPassRate: computeFirstGradeNursingPassRateV13(records),
        nursingRoundsArrivalRate: computeNursingRoundsArrivalRateV13(records),
      }));
    },
  },
];
