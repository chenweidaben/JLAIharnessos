/**
 * 健澜科技 jlmedaios - 床位管理 V13 路由（M373-B）
 *
 * GET /api/v1/bed-management
 *
 * 权限：bed-management:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeActualOpenBedCountV13,
  computeBedTurnoverCountV13,
  computeBedUsageRateV13,
  type BedManagementRecordV13,
} from "../aggregators/bedManagementV13Aggregator.js";

const records: BedManagementRecordV13[] = [
  { actualOpenBedCount: 500, actualOccupiedBedDays: 30000, actualOpenBedDays: 36500, dischargeCount: 480 },
  { actualOpenBedCount: 500, actualOccupiedBedDays: 30000, actualOpenBedDays: 36500, dischargeCount: 480 },
];

export const bedManagementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bed-management",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bed-management:read");
      if (denied) return denied;
      return json(ok({
        actualOpenBedCount: computeActualOpenBedCountV13(records),
        bedUsageRate: computeBedUsageRateV13(records),
        bedTurnoverCount: computeBedTurnoverCountV13(records),
      }));
    },
  },
];
