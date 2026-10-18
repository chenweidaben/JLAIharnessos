/**
 * 健澜科技 jlmedaios - 药事质量管理 V13 路由（M431-A，-quality 后缀避让旧版 pharmacyDetailV13（M418））
 *
 * GET /api/v1/medication-quality-mgmt
 *
 * 权限：medication-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMedicationInventoryTurnoverRateV13,
  computeMedicationInventoryVarianceRateV13,
  computeMedicationPrescriptionPassRateV13,
  type MedicationQualityMgmtRecordV13,
} from "../aggregators/medicationQualityMgmtV13Aggregator.js";

const records: MedicationQualityMgmtRecordV13[] = [
  { prescriptionPass: 980, prescriptionTotal: 1000, totalCost: 120000, avgInventory: 20000, varianceVarieties: 5, totalVarieties: 1000 },
  { prescriptionPass: 980, prescriptionTotal: 1000, totalCost: 120000, avgInventory: 20000, varianceVarieties: 5, totalVarieties: 1000 },
];

export const medicationQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medication-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medication-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        medicationPrescriptionPassRate: computeMedicationPrescriptionPassRateV13(records),
        medicationInventoryTurnoverRate: computeMedicationInventoryTurnoverRateV13(records),
        medicationInventoryVarianceRate: computeMedicationInventoryVarianceRateV13(records),
      }));
    },
  },
];
