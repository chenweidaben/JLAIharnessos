/**
 * 健澜科技 jlmedaios - 手术部位感染率 V13 路由（M339-C）
 *
 * GET /api/v1/ssi-rate
 *
 * 权限：ssi-rate:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSSIRateV13,
  type SSIRecordV13,
} from "../aggregators/ssiRateV13Aggregator.js";

const records: SSIRecordV13[] = [
  { totalSurgeries: 500, ssiCount: 5 },
];

export const ssiRateV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ssi-rate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ssi-rate:read");
      if (denied) return denied;
      return json(ok({
        ssiRate: computeSSIRateV13(records),
      }));
    },
  },
];
