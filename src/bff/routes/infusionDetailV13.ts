/**
 * 健澜科技 jlmedaios - 输液管理（细节）V13 路由（M424-C，detail 避让旧版 infusionMgmtV13（M359-D））
 *
 * GET /api/v1/infusion-detail
 *
 * 权限：infusion-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInfusionPatrolArriveRateV13,
  computeInfusionPunctureSuccessRateV13,
  computeInfusionReactionOccurrenceRateV13,
  type InfusionDetailRecordV13,
} from "../aggregators/infusionDetailV13Aggregator.js";

const records: InfusionDetailRecordV13[] = [
  { reactionOccurred: 5, infusionTotal: 10000, punctureSuccess: 990, punctureTotal: 1000, patrolArrived: 980, shouldPatrolTotal: 1000 },
  { reactionOccurred: 5, infusionTotal: 10000, punctureSuccess: 990, punctureTotal: 1000, patrolArrived: 980, shouldPatrolTotal: 1000 },
];

export const infusionDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infusion-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infusion-detail:read");
      if (denied) return denied;
      return json(ok({
        infusionReactionOccurrenceRate: computeInfusionReactionOccurrenceRateV13(records),
        infusionPunctureSuccessRate: computeInfusionPunctureSuccessRateV13(records),
        infusionPatrolArriveRate: computeInfusionPatrolArriveRateV13(records),
      }));
    },
  },
];
