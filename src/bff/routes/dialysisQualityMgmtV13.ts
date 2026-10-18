/**
 * 健澜科技 jlmedaios - 透析质量管理 V13 路由（M429-A，-quality 后缀避让旧版 dialysisMgmtV13（M417））
 *
 * GET /api/v1/dialysis-quality-mgmt
 *
 * 权限：dialysis-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDialysisAccessInfectionRateV13,
  computeDialysisAdequacyRateV13,
  computeDialysisHypotensionOccurrenceRateV13,
  type DialysisQualityMgmtRecordV13,
} from "../aggregators/dialysisQualityMgmtV13Aggregator.js";

const records: DialysisQualityMgmtRecordV13[] = [
  { adequate: 950, dialysisTotal: 1000, hypotension: 30, accessInfection: 10, dialysisSessionTotal: 10000 },
  { adequate: 950, dialysisTotal: 1000, hypotension: 30, accessInfection: 10, dialysisSessionTotal: 10000 },
];

export const dialysisQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dialysis-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dialysis-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dialysisAdequacyRate: computeDialysisAdequacyRateV13(records),
        dialysisHypotensionOccurrenceRate: computeDialysisHypotensionOccurrenceRateV13(records),
        dialysisAccessInfectionRate: computeDialysisAccessInfectionRateV13(records),
      }));
    },
  },
];
