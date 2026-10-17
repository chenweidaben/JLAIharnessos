/**
 * 健澜科技 jlmedaios - 胸痛中心 V13 路由（M348-C）
 *
 * GET /api/v1/chest-pain-center
 *
 * 权限：chest-pain-center:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDToBMinutesV13,
  computeDoorToBalloonQualifiedRateV13,
  computeSTEMIRatioV13,
  type ChestPainCenterRecordV13,
} from "../aggregators/chestPainCenterV13Aggregator.js";

const records: ChestPainCenterRecordV13[] = [
  { dtoBMinutes: 90, stemiCount: 20, chestPainTotal: 50, doorToBalloonQualified: 45, dtoBTotal: 50 },
  { dtoBMinutes: 100, stemiCount: 30, chestPainTotal: 50, doorToBalloonQualified: 48, dtoBTotal: 50 },
];

export const chestPainCenterV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/chest-pain-center",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "chest-pain-center:read");
      if (denied) return denied;
      return json(ok({
        dtoBMinutes: computeDToBMinutesV13(records),
        stemiRatio: computeSTEMIRatioV13(records),
        doorToBalloonQualifiedRate: computeDoorToBalloonQualifiedRateV13(records),
      }));
    },
  },
];
