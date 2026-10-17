/**
 * 健澜科技 jlmedaios - 资源利用明细 V13 路由（M381-D，M381 收官）
 *
 * GET /api/v1/resource-util-detail
 *
 * 权限：resource-util-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedUsageRateV13,
  computeLargeEquipmentUsageRateV13,
  computeOperatingRoomUsageRateV13,
  type ResourceUtilDetailRecordV13,
} from "../aggregators/resourceUtilDetailV13Aggregator.js";

const records: ResourceUtilDetailRecordV13[] = [
  { occupiedBedDays: 950, openBedDays: 1000, surgeryHours: 480, openHours: 600, usageHours: 120, availableHours: 150 },
  { occupiedBedDays: 950, openBedDays: 1000, surgeryHours: 480, openHours: 600, usageHours: 120, availableHours: 150 },
];

export const resourceUtilDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/resource-util-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "resource-util-detail:read");
      if (denied) return denied;
      return json(ok({
        bedUsageRate: computeBedUsageRateV13(records),
        operatingRoomUsageRate: computeOperatingRoomUsageRateV13(records),
        largeEquipmentUsageRate: computeLargeEquipmentUsageRateV13(records),
      }));
    },
  },
];
