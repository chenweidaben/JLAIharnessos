/**
 * 健澜科技 jlmedaios - 抗菌药物管理 V13 路由（M357-D，M357 收官）
 *
 * GET /api/v1/antibiotic-mgmt
 *
 * 权限：antibiotic-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticDddsV13,
  computeRestrictedClassRateV13,
  computeTherapeuticMicrobiologyTestRateV13,
  type AntibioticMgmtRecordV13,
} from "../aggregators/antibioticMgmtV13Aggregator.js";

const records: AntibioticMgmtRecordV13[] = [
  { ddds: 40.5, restrictedUseQuantity: 100, totalAntibioticQuantity: 400, therapeuticMicrobiologyTested: 90, therapeuticUseCount: 150 },
  { ddds: 39.5, restrictedUseQuantity: 100, totalAntibioticQuantity: 600, therapeuticMicrobiologyTested: 110, therapeuticUseCount: 150 },
];

export const antibioticMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-mgmt:read");
      if (denied) return denied;
      return json(ok({
        ddds: computeAntibioticDddsV13(records),
        restrictedClassRate: computeRestrictedClassRateV13(records),
        therapeuticMicrobiologyTestRate: computeTherapeuticMicrobiologyTestRateV13(records),
      }));
    },
  },
];
