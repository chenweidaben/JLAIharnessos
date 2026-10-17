/**
 * 健澜科技 jlmedaios - 护理安全 V13 路由（M369-B）
 *
 * GET /api/v1/nursing-safety
 *
 * 权限：nursing-safety:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFallRateV13,
  computeNursingAdverseEventCountV13,
  computePressureUlcerRateV13,
  type NursingSafetyRecordV13,
} from "../aggregators/nursingSafetyV13Aggregator.js";

const records: NursingSafetyRecordV13[] = [
  { adverseEventCount: 5, inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3 },
  { adverseEventCount: 5, inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3 },
];

export const nursingSafetyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-safety",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-safety:read");
      if (denied) return denied;
      return json(ok({
        nursingAdverseEventCount: computeNursingAdverseEventCountV13(records),
        pressureUlcerRate: computePressureUlcerRateV13(records),
        fallRate: computeFallRateV13(records),
      }));
    },
  },
];
