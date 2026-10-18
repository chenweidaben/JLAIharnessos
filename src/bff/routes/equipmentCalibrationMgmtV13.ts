/**
 * 健澜科技 jlmedaios - 设备计量校准管理 V13 路由（M449-C，医疗装备与设备管理组）
 *
 * GET /api/v1/equipment-calibration-mgmt
 *
 * 权限：equipment-calibration-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEquipmentCalibrationMandatoryCoverageRateV13,
  computeEquipmentCalibrationPeriodicRateV13,
  computeEquipmentCalibrationQualifiedRateV13,
  type EquipmentCalibrationMgmtRecordV13,
} from "../aggregators/equipmentCalibrationMgmtV13Aggregator.js";

const records: EquipmentCalibrationMgmtRecordV13[] = [
  { ontime: 950, shouldCalibrate: 1000, qualified: 900, totalCalibrated: 1000, covered: 980, totalMandatory: 1000 },
  { ontime: 950, shouldCalibrate: 1000, qualified: 900, totalCalibrated: 1000, covered: 980, totalMandatory: 1000 },
];

export const equipmentCalibrationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-calibration-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-calibration-mgmt:read");
      if (denied) return denied;
      return json(ok({
        equipmentCalibrationPeriodicRate: computeEquipmentCalibrationPeriodicRateV13(records),
        equipmentCalibrationQualifiedRate: computeEquipmentCalibrationQualifiedRateV13(records),
        equipmentCalibrationMandatoryCoverageRate: computeEquipmentCalibrationMandatoryCoverageRateV13(records),
      }));
    },
  },
];
