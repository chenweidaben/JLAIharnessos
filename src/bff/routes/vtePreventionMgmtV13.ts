/**
 * 健澜科技 jlmedaios - VTE 预防管理 V13 路由（M414-D，M414 收官）
 *
 * GET /api/v1/vte-prevention-mgmt
 *
 * 权限：vte-prevention-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdmissionVteRiskAssessmentRateV13,
  computeInpatientVteOccurrenceRateV13,
  computeVtePreventionMeasureImplementationRateV13,
  type VtePreventionMgmtRecordV13,
} from "../aggregators/vtePreventionMgmtV13Aggregator.js";

const records: VtePreventionMgmtRecordV13[] = [
  { assessed: 990, admissionTotal: 1000, implemented: 950, shouldPreventTotal: 1000, occurred: 10, inpatientTotal: 1000 },
  { assessed: 990, admissionTotal: 1000, implemented: 950, shouldPreventTotal: 1000, occurred: 10, inpatientTotal: 1000 },
];

export const vtePreventionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/vte-prevention-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "vte-prevention-mgmt:read");
      if (denied) return denied;
      return json(ok({
        admissionVteRiskAssessmentRate: computeAdmissionVteRiskAssessmentRateV13(records),
        vtePreventionMeasureImplementationRate: computeVtePreventionMeasureImplementationRateV13(records),
        inpatientVteOccurrenceRate: computeInpatientVteOccurrenceRateV13(records),
      }));
    },
  },
];
