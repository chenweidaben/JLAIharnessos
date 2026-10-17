/**
 * 健澜科技 jlmedaios - 麻醉相关并发症 V13 路由（M339-B）
 *
 * GET /api/v1/anesthesia-complication
 *
 * 权限：anesthesia-complication:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSevereComplicationRateV13,
  computeTotalComplicationRateV13,
  type AnesthesiaComplicationRecordV13,
} from "../aggregators/anesthesiaComplicationV13Aggregator.js";

const records: AnesthesiaComplicationRecordV13[] = [
  { totalAnesthesia: 1000, complicationCount: 5, severeComplicationCount: 1 },
];

export const anesthesiaComplicationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/anesthesia-complication",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "anesthesia-complication:read");
      if (denied) return denied;
      return json(ok({
        totalRate: computeTotalComplicationRateV13(records),
        severeRate: computeSevereComplicationRateV13(records),
      }));
    },
  },
];
