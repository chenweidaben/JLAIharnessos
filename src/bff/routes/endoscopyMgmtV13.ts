/**
 * 健澜科技 jlmedaios - 内镜管理 V13 路由（M417-B）
 *
 * GET /api/v1/endoscopy-mgmt
 *
 * 权限：endoscopy-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEndoscopyCleaningDisinfectionPassRateV13,
  computeEndoscopyPathologyMatchRateV13,
  computeEndoscopyTreatmentComplicationRateV13,
  type EndoscopyMgmtRecordV13,
} from "../aggregators/endoscopyMgmtV13Aggregator.js";

const records: EndoscopyMgmtRecordV13[] = [
  { cleaningQualified: 990, cleaningTotal: 1000, pathologyMatch: 950, endoscopyDiagnosisTotal: 1000, complication: 10, treatmentTotal: 1000 },
  { cleaningQualified: 990, cleaningTotal: 1000, pathologyMatch: 950, endoscopyDiagnosisTotal: 1000, complication: 10, treatmentTotal: 1000 },
];

export const endoscopyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/endoscopy-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "endoscopy-mgmt:read");
      if (denied) return denied;
      return json(ok({
        endoscopyCleaningDisinfectionPassRate: computeEndoscopyCleaningDisinfectionPassRateV13(records),
        endoscopyPathologyMatchRate: computeEndoscopyPathologyMatchRateV13(records),
        endoscopyTreatmentComplicationRate: computeEndoscopyTreatmentComplicationRateV13(records),
      }));
    },
  },
];
