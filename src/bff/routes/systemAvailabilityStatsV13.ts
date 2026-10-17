/**
 * 健澜科技 jlmedaios - 系统可用率 V13 路由（M353-C，stats 避让已有 systemAvailabilityV13）
 *
 * GET /api/v1/system-availability-stats
 *
 * 权限：system-availability-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHisAvailabilityRateV13,
  computeMTTRMinutesV13,
  computeUnplannedDowntimeMinutesV13,
  type SystemAvailabilityStatsRecordV13,
} from "../aggregators/systemAvailabilityStatsV13Aggregator.js";

const records: SystemAvailabilityStatsRecordV13[] = [
  { hisAvailableMinutes: 43000, hisTotalMinutes: 43200, mttrMinutes: 30, unplannedDowntimeMinutes: 200 },
  { hisAvailableMinutes: 43000, hisTotalMinutes: 43200, mttrMinutes: 50, unplannedDowntimeMinutes: 200 },
];

export const systemAvailabilityStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/system-availability-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "system-availability-stats:read");
      if (denied) return denied;
      return json(ok({
        hisAvailabilityRate: computeHisAvailabilityRateV13(records),
        mttrMinutes: computeMTTRMinutesV13(records),
        unplannedDowntimeMinutes: computeUnplannedDowntimeMinutesV13(records),
      }));
    },
  },
];
