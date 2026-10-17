/**
 * 健澜科技 jlmedaios - 麻醉质量 V13 路由（M371-D，M371 收官）
 *
 * GET /api/v1/anesthesia-quality
 *
 * 权限：anesthesia-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnesthesiaComplicationRateV13,
  computeAnesthesiaMortalityRateV13,
  computePostoperativeAnalgesiaRateV13,
  type AnesthesiaQualityRecordV13,
} from "../aggregators/anesthesiaQualityV13Aggregator.js";

const records: AnesthesiaQualityRecordV13[] = [
  { anesthesiaCount: 1000, anesthesiaMortalityCount: 1, anesthesiaComplicationCount: 5, surgeryCount: 1000, postoperativeAnalgesiaCount: 800 },
  { anesthesiaCount: 1000, anesthesiaMortalityCount: 1, anesthesiaComplicationCount: 5, surgeryCount: 1000, postoperativeAnalgesiaCount: 800 },
];

export const anesthesiaQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/anesthesia-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "anesthesia-quality:read");
      if (denied) return denied;
      return json(ok({
        anesthesiaMortalityRate: computeAnesthesiaMortalityRateV13(records),
        anesthesiaComplicationRate: computeAnesthesiaComplicationRateV13(records),
        postoperativeAnalgesiaRate: computePostoperativeAnalgesiaRateV13(records),
      }));
    },
  },
];
