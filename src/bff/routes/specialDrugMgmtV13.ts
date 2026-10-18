/**
 * 健澜科技 jlmedaios - 特殊药品管理 V13 路由（M455-D，M455 收官，药品供应与库存管理组）
 *
 * GET /api/v1/special-drug-mgmt
 *
 * 权限：special-drug-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSpecialDrugAccountMatchRateV13,
  computeSpecialDrugHandoverRecordCompletenessRateV13,
  computeSpecialDrugPrescriptionQualifiedRateV13,
  type SpecialDrugMgmtRecordV13,
} from "../aggregators/specialDrugMgmtV13Aggregator.js";

const records: SpecialDrugMgmtRecordV13[] = [
  { matched: 950, totalItem: 1000, qualified: 900, totalPrescription: 1000, complete: 980, totalRecord: 1000 },
  { matched: 950, totalItem: 1000, qualified: 900, totalPrescription: 1000, complete: 980, totalRecord: 1000 },
];

export const specialDrugMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/special-drug-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "special-drug-mgmt:read");
      if (denied) return denied;
      return json(ok({
        specialDrugAccountMatchRate: computeSpecialDrugAccountMatchRateV13(records),
        specialDrugPrescriptionQualifiedRate: computeSpecialDrugPrescriptionQualifiedRateV13(records),
        specialDrugHandoverRecordCompletenessRate: computeSpecialDrugHandoverRecordCompletenessRateV13(records),
      }));
    },
  },
];
