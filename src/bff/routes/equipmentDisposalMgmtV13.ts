/**
 * 健澜科技 jlmedaios - 设备报废处置管理 V13 路由（M449-D，M449 收官，医疗装备与设备管理组）
 *
 * GET /api/v1/equipment-disposal-mgmt
 *
 * 权限：equipment-disposal-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEquipmentDisposalAssetTurnoverRateV13,
  computeEquipmentDisposalAssessmentComplianceRateV13,
  computeEquipmentDisposalTimelinessRateV13,
  type EquipmentDisposalMgmtRecordV13,
} from "../aggregators/equipmentDisposalMgmtV13Aggregator.js";

const records: EquipmentDisposalMgmtRecordV13[] = [
  { compliant: 950, shouldAssess: 1000, timely: 900, shouldDispose: 1000, disposed: 50, totalAsset: 1000 },
  { compliant: 950, shouldAssess: 1000, timely: 900, shouldDispose: 1000, disposed: 50, totalAsset: 1000 },
];

export const equipmentDisposalMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/equipment-disposal-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "equipment-disposal-mgmt:read");
      if (denied) return denied;
      return json(ok({
        equipmentDisposalAssessmentComplianceRate: computeEquipmentDisposalAssessmentComplianceRateV13(records),
        equipmentDisposalTimelinessRate: computeEquipmentDisposalTimelinessRateV13(records),
        equipmentDisposalAssetTurnoverRate: computeEquipmentDisposalAssetTurnoverRateV13(records),
      }));
    },
  },
];
