/**
 * 健澜科技 jlmedaios - 大型设备开机率 V13 路由（M351-B）
 *
 * GET /api/v1/equipment-utilization
 *
 * 权限：equipment-utilization:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCTHoursV13,
  computeDSAHoursV13,
  computeMRIHoursV13,
  type EquipmentUtilizationRecordV13,
} from "../aggregators/equipmentUtilizationV13Aggregator.js";

const records: EquipmentUtilizationRecordV13[] = [
  { ctHours: 200, mriHours: 150, dsaHours: 80 },
  { ctHours: 200, mriHours: 150, dsaHours: 80 },
];

export const equipmentUtilizationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-utilization",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-utilization:read");
      if (denied) return denied;
      return json(ok({
        ctHours: computeCTHoursV13(records),
        mriHours: computeMRIHoursV13(records),
        dsaHours: computeDSAHoursV13(records),
      }));
    },
  },
];
