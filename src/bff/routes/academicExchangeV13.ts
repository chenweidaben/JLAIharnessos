/**
 * 健澜科技 jlmedaios - 学术交流 V13 路由（M361-D，M361 收官）
 *
 * GET /api/v1/academic-exchange
 *
 * 权限：academic-exchange:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAcademicConferenceCountV13,
  computeAcademicPositionCountV13,
  computePublishedPaperCountV13,
  type AcademicExchangeRecordV13,
} from "../aggregators/academicExchangeV13Aggregator.js";

const records: AcademicExchangeRecordV13[] = [
  { conferenceCount: 3, paperCount: 15, academicPositionCount: 10 },
  { conferenceCount: 2, paperCount: 15, academicPositionCount: 10 },
];

export const academicExchangeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/academic-exchange",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "academic-exchange:read");
      if (denied) return denied;
      return json(ok({
        conferenceCount: computeAcademicConferenceCountV13(records),
        paperCount: computePublishedPaperCountV13(records),
        academicPositionCount: computeAcademicPositionCountV13(records),
      }));
    },
  },
];
