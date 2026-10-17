/**
 * 健澜科技 jlmedaios - 车辆管理 V13 路由（M352-D，M352 收官）
 *
 * GET /api/v1/parking-mgmt
 *
 * 权限：parking-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyVehicleWaitMinutesV13,
  computeParkingOccupancyRateV13,
  computeVisitorRegisterRateV13,
  type ParkingMgmtRecordV13,
} from "../aggregators/parkingMgmtV13Aggregator.js";

const records: ParkingMgmtRecordV13[] = [
  { usedParkingCount: 80, totalParkingCount: 100, emergencyWaitMinutes: 5, visitorRegisteredCount: 90, visitorTotalCount: 100 },
  { usedParkingCount: 70, totalParkingCount: 100, emergencyWaitMinutes: 7, visitorRegisteredCount: 85, visitorTotalCount: 100 },
];

export const parkingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/parking-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "parking-mgmt:read");
      if (denied) return denied;
      return json(ok({
        parkingOccupancyRate: computeParkingOccupancyRateV13(records),
        emergencyVehicleWaitMinutes: computeEmergencyVehicleWaitMinutesV13(records),
        visitorRegisterRate: computeVisitorRegisterRateV13(records),
      }));
    },
  },
];
