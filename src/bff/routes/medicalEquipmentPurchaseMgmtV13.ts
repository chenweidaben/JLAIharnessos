/**
 * 健澜科技 jlmedaios - 医疗设备采购管理 V13 路由（M449-A，医疗装备与设备管理组）
 *
 * GET /api/v1/medical-equipment-purchase-mgmt
 *
 * 权限：medical-equipment-purchase-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13,
  computeMedicalEquipmentPurchaseBiddingComplianceRateV13,
  computeMedicalEquipmentPurchasePlanCompletionRateV13,
  type MedicalEquipmentPurchaseMgmtRecordV13,
} from "../aggregators/medicalEquipmentPurchaseMgmtV13Aggregator.js";

const records: MedicalEquipmentPurchaseMgmtRecordV13[] = [
  { completed: 950, planned: 1000, compliant: 900, totalBidding: 1000, qualified: 980, totalAcceptance: 1000 },
  { completed: 950, planned: 1000, compliant: 900, totalBidding: 1000, qualified: 980, totalAcceptance: 1000 },
];

export const medicalEquipmentPurchaseMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-equipment-purchase-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-equipment-purchase-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicalEquipmentPurchasePlanCompletionRate: computeMedicalEquipmentPurchasePlanCompletionRateV13(records),
        medicalEquipmentPurchaseBiddingComplianceRate: computeMedicalEquipmentPurchaseBiddingComplianceRateV13(records),
        medicalEquipmentPurchaseAcceptanceQualifiedRate: computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13(records),
      }));
    },
  },
];
