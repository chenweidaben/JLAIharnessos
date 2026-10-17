/**
 * 健澜科技 jlmedaios - 资源利用 V13 路由（M364-D，M364 收官）
 *
 * GET /api/v1/resource-util
 *
 * 权限：resource-util:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLargeEquipmentUtilRateV13,
  computeOrUtilRateV13,
  computeWardUtilRateV13,
  type ResourceUtilRecordV13,
} from "../aggregators/resourceUtilV13Aggregator.js";

const records: ResourceUtilRecordV13[] = [
  { equipmentActualHours: 800, equipmentRatedHours: 1000, wardOccupiedBedDays: 4800, wardOpenBedDays: 6000, orSurgeryHours: 400, orAvailableHours: 500 },
  { equipmentActualHours: 800, equipmentRatedHours: 1000, wardOccupiedBedDays: 4800, wardOpenBedDays: 6000, orSurgeryHours: 400, orAvailableHours: 500 },
];

export const resourceUtilV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/resource-util",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "resource-util:read");
      if (denied) return denied;
      return json(ok({
        largeEquipmentUtilRate: computeLargeEquipmentUtilRateV13(records),
        wardUtilRate: computeWardUtilRateV13(records),
        orUtilRate: computeOrUtilRateV13(records),
      }));
    },
  },
];
