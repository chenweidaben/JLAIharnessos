/**
 * 健澜科技 jlmedaios - 超声检查量 V13 路由（M342-D）
 *
 * GET /api/v1/ultrasound-volume
 *
 * 权限：ultrasound-volume:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAbdominalCountV13,
  computeCardiovascularCountV13,
  computeObstetricsCountV13,
  type UltrasoundVolumeRecordV13,
} from "../aggregators/ultrasoundVolumeV13Aggregator.js";

const records: UltrasoundVolumeRecordV13[] = [
  { abdominalCount: 200, cardiovascularCount: 100, obstetricsCount: 80 },
  { abdominalCount: 300, cardiovascularCount: 150, obstetricsCount: 120 },
];

export const ultrasoundVolumeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ultrasound-volume",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ultrasound-volume:read");
      if (denied) return denied;
      return json(ok({
        abdominalCount: computeAbdominalCountV13(records),
        cardiovascularCount: computeCardiovascularCountV13(records),
        obstetricsCount: computeObstetricsCountV13(records),
      }));
    },
  },
];
