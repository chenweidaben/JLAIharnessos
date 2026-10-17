/**
 * 健澜科技 jlmedaios - 学术交流统计 V13 路由（M383-D，stats 避让，M383 收官）
 *
 * GET /api/v1/academic-exchange-stats
 *
 * 权限：academic-exchange-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAcademicConferenceCountV13,
  computeExpertVisitCountV13,
  computeOutgoingTrainingCountV13,
  type AcademicExchangeRecordV13,
} from "../aggregators/academicExchangeStatsV13Aggregator.js";

const records: AcademicExchangeRecordV13[] = [
  { conferenceCount: 10, outgoingTrainingCount: 30, expertVisitCount: 15 },
  { conferenceCount: 10, outgoingTrainingCount: 30, expertVisitCount: 15 },
];

export const academicExchangeStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/academic-exchange-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "academic-exchange-stats:read");
      if (denied) return denied;
      return json(ok({
        academicConferenceCount: computeAcademicConferenceCountV13(records),
        outgoingTrainingCount: computeOutgoingTrainingCountV13(records),
        expertVisitCount: computeExpertVisitCountV13(records),
      }));
    },
  },
];
