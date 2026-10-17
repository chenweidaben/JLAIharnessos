/**
 * 健澜科技 jlmedaios - 护理敏感指标 V13 路由（M376-C）
 *
 * GET /api/v1/nursing-sensitive-index
 *
 * 权限：nursing-sensitive-index:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFallRateV13,
  computePressureUlcerRateV13,
  computeUnplannedExtubationRateV13,
  type NursingSensitiveIndexRecordV13,
} from "../aggregators/nursingSensitiveIndexV13Aggregator.js";

const records: NursingSensitiveIndexRecordV13[] = [
  { inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3, intubationCount: 100, unplannedExtubationCount: 5 },
  { inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3, intubationCount: 100, unplannedExtubationCount: 5 },
];

export const nursingSensitiveIndexV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-sensitive-index",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-sensitive-index:read");
      if (denied) return denied;
      return json(ok({
        pressureUlcerRate: computePressureUlcerRateV13(records),
        fallRate: computeFallRateV13(records),
        unplannedExtubationRate: computeUnplannedExtubationRateV13(records),
      }));
    },
  },
];
