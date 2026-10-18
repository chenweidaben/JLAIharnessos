/**
 * 健澜科技 jlmedaios - 手术室质量管理 V13 路由（M429-C，-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
 *
 * GET /api/v1/operating-room-quality-mgmt
 *
 * 权限：operating-room-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOperatingRoomConsumableWasteRateV13,
  computeOperatingRoomContinuousSurgeryMinutesV13,
  computeOperatingRoomSterilePassRateV13,
  type OperatingRoomQualityMgmtRecordV13,
} from "../aggregators/operatingRoomQualityMgmtV13Aggregator.js";

const records: OperatingRoomQualityMgmtRecordV13[] = [
  { sterilePass: 980, sterileTotal: 1000, continuousMinutes: 25.5, wasteAmount: 500, totalAmount: 10000 },
  { sterilePass: 980, sterileTotal: 1000, continuousMinutes: 34.3, wasteAmount: 500, totalAmount: 10000 },
];

export const operatingRoomQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operating-room-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operating-room-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        operatingRoomSterilePassRate: computeOperatingRoomSterilePassRateV13(records),
        operatingRoomContinuousSurgeryMinutes: computeOperatingRoomContinuousSurgeryMinutesV13(records),
        operatingRoomConsumableWasteRate: computeOperatingRoomConsumableWasteRateV13(records),
      }));
    },
  },
];
