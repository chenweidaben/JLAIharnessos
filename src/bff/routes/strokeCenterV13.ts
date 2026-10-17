/**
 * 健澜科技 jlmedaios - 卒中中心 V13 路由（M348-D，M348 收官）
 *
 * GET /api/v1/stroke-center
 *
 * 权限：stroke-center:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDNTMinutesV13,
  computeIVThrombolysisRateV13,
  computeThrombectomyRateV13,
  type StrokeCenterRecordV13,
} from "../aggregators/strokeCenterV13Aggregator.js";

const records: StrokeCenterRecordV13[] = [
  { dntMinutes: 40, ivThrombolysisCount: 15, strokeTotalCount: 50, thrombectomyCount: 5 },
  { dntMinutes: 50, ivThrombolysisCount: 15, strokeTotalCount: 50, thrombectomyCount: 5 },
];

export const strokeCenterV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/stroke-center",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "stroke-center:read");
      if (denied) return denied;
      return json(ok({
        dntMinutes: computeDNTMinutesV13(records),
        ivThrombolysisRate: computeIVThrombolysisRateV13(records),
        thrombectomyRate: computeThrombectomyRateV13(records),
      }));
    },
  },
];
