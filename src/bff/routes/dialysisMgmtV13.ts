/**
 * 健澜科技 jlmedaios - 血液透析管理 V13 路由（M417-A）
 *
 * GET /api/v1/dialysis-mgmt
 *
 * 权限：dialysis-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDialysisAccessInfectionRateV13,
  computeDialysisHypotensionRateV13,
  computeDialysisKtvPassRateV13,
  type DialysisMgmtRecordV13,
} from "../aggregators/dialysisMgmtV13Aggregator.js";

const records: DialysisMgmtRecordV13[] = [
  { ktvQualified: 900, dialysisTotal: 1000, hypotension: 20, dialysisCaseTotal: 1000, infection: 5, accessTotal: 1000 },
  { ktvQualified: 900, dialysisTotal: 1000, hypotension: 20, dialysisCaseTotal: 1000, infection: 5, accessTotal: 1000 },
];

export const dialysisMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dialysis-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dialysis-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dialysisKtvPassRate: computeDialysisKtvPassRateV13(records),
        dialysisHypotensionRate: computeDialysisHypotensionRateV13(records),
        dialysisAccessInfectionRate: computeDialysisAccessInfectionRateV13(records),
      }));
    },
  },
];
