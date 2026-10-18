/**
 * 健澜科技 jlmedaios - 跌倒坠床风险管理 V13 路由（M439-B，患者安全与医疗风险管理组）
 *
 * GET /api/v1/fall-incident
 *
 * 权限：fall-incident:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFallIncidentHighRiskAssessmentRateV13,
  computeFallIncidentInjuryClassificationRateV13,
  computeFallIncidentRateV13,
  type FallIncidentRecordV13,
} from "../aggregators/fallIncidentV13Aggregator.js";

const records: FallIncidentRecordV13[] = [
  { fallCount: 10, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, classifiedInjury: 950, totalFall: 1000 },
  { fallCount: 10, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, classifiedInjury: 950, totalFall: 1000 },
];

export const fallIncidentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fall-incident",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fall-incident:read");
      if (denied) return denied;
      return json(ok({
        fallIncidentRate: computeFallIncidentRateV13(records),
        fallIncidentHighRiskAssessmentRate: computeFallIncidentHighRiskAssessmentRateV13(records),
        fallIncidentInjuryClassificationRate: computeFallIncidentInjuryClassificationRateV13(records),
      }));
    },
  },
];
