/**
 * 健澜科技 jlmedaios - 设备管理 V13 路由（M377-B）
 *
 * GET /api/v1/equipment-mgmt
 *
 * 权限：equipment-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEquipmentGoodRateV13,
  computeEquipmentInspectionCompletionRateV13,
  computeMedicalEquipmentCountV13,
  type EquipmentMgmtRecordV13,
} from "../aggregators/equipmentMgmtV13Aggregator.js";

const records: EquipmentMgmtRecordV13[] = [
  { equipmentTotalCount: 1000, equipmentGoodCount: 950, shouldInspectCount: 100, inspectCompleteCount: 98 },
  { equipmentTotalCount: 1000, equipmentGoodCount: 950, shouldInspectCount: 100, inspectCompleteCount: 98 },
];

export const equipmentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalEquipmentCount: computeMedicalEquipmentCountV13(records),
        equipmentGoodRate: computeEquipmentGoodRateV13(records),
        equipmentInspectionCompletionRate: computeEquipmentInspectionCompletionRateV13(records),
      }));
    },
  },
];
