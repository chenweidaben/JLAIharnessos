/**
 * 健澜科技 jlmedaios - 医疗设备管理（细节）V13 路由（M418-B，detail 避让旧版 equipmentMgmtV13/consumableSupplyV13）
 *
 * GET /api/v1/medical-equipment-mgmt-detail
 *
 * 权限：medical-equipment-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEquipmentCalibrationPassRateV13,
  computeEquipmentInspectionCompletionRateV13,
  computeEquipmentRepairTimelyRateV13,
  type MedicalEquipmentMgmtDetailRecordV13,
} from "../aggregators/medicalEquipmentMgmtDetailV13Aggregator.js";

const records: MedicalEquipmentMgmtDetailRecordV13[] = [
  { inspectionDone: 980, shouldInspectTotal: 1000, repairTimely: 950, repairTotal: 1000, calibrationQualified: 990, calibrationTotal: 1000 },
  { inspectionDone: 980, shouldInspectTotal: 1000, repairTimely: 950, repairTotal: 1000, calibrationQualified: 990, calibrationTotal: 1000 },
];

export const medicalEquipmentMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-equipment-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-equipment-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        equipmentInspectionCompletionRate: computeEquipmentInspectionCompletionRateV13(records),
        equipmentRepairTimelyRate: computeEquipmentRepairTimelyRateV13(records),
        equipmentCalibrationPassRate: computeEquipmentCalibrationPassRateV13(records),
      }));
    },
  },
];
