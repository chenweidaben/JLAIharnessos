/**
 * 健澜科技 jlmedaios - 三级查房管理 V13 路由（M404-A）
 *
 * GET /api/v1/three-level-ward-round
 *
 * 权限：three-level-ward-round:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAttendingPhysicianWardRoundRateV13,
  computeChiefPhysicianWardRoundRateV13,
  computeResidentPhysicianWardRoundRateV13,
  type ThreeLevelWardRoundRecordV13,
} from "../aggregators/threeLevelWardRoundV13Aggregator.js";

const records: ThreeLevelWardRoundRecordV13[] = [
  { chiefDone: 95, chiefTotal: 100, attendingDone: 98, attendingTotal: 100, residentDone: 100, residentTotal: 100 },
  { chiefDone: 95, chiefTotal: 100, attendingDone: 98, attendingTotal: 100, residentDone: 100, residentTotal: 100 },
];

export const threeLevelWardRoundV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/three-level-ward-round",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "three-level-ward-round:read");
      if (denied) return denied;
      return json(ok({
        chiefPhysicianWardRoundRate: computeChiefPhysicianWardRoundRateV13(records),
        attendingPhysicianWardRoundRate: computeAttendingPhysicianWardRoundRateV13(records),
        residentPhysicianWardRoundRate: computeResidentPhysicianWardRoundRateV13(records),
      }));
    },
  },
];
