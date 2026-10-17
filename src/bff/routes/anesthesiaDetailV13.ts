/**
 * 健澜科技 jlmedaios - 麻醉质量 V13 路由（M391-B）
 *
 * GET /api/v1/anesthesia-detail
 *
 * 权限：anesthesia-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnesthesiaAdverseEventRateV13,
  computeAnesthesiaRecoveryTimeAvgV13,
  computeAnesthesiaStartTimeAvgV13,
  type AnesthesiaDetailRecordV13,
} from "../aggregators/anesthesiaDetailV13Aggregator.js";

const records: AnesthesiaDetailRecordV13[] = [
  { totalStartMinutes: 1500, totalRecoveryMinutes: 3000, anesthesiaCount: 100, recoveryCount: 100, adverseEventCount: 2 },
  { totalStartMinutes: 1500, totalRecoveryMinutes: 3000, anesthesiaCount: 100, recoveryCount: 100, adverseEventCount: 2 },
];

export const anesthesiaDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/anesthesia-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "anesthesia-detail:read");
      if (denied) return denied;
      return json(ok({
        anesthesiaStartTimeAvg: computeAnesthesiaStartTimeAvgV13(records),
        anesthesiaRecoveryTimeAvg: computeAnesthesiaRecoveryTimeAvgV13(records),
        anesthesiaAdverseEventRate: computeAnesthesiaAdverseEventRateV13(records),
      }));
    },
  },
];
