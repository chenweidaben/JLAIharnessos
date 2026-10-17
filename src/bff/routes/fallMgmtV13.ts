/**
 * 健澜科技 jlmedaios - 跌倒管理 V13 路由（M422-C）
 *
 * GET /api/v1/fall-mgmt
 *
 * 权限：fall-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFallInjuryGradeRateV13,
  computeFallOccurrenceRateV13,
  computeFallRiskAssessmentRateV13,
  type FallMgmtRecordV13,
} from "../aggregators/fallMgmtV13Aggregator.js";

const records: FallMgmtRecordV13[] = [
  { assessed: 950, shouldAssess: 1000, occurredPatients: 5, inpatientTotal: 10000, gradedCompliant: 95, fallTotal: 100 },
  { assessed: 950, shouldAssess: 1000, occurredPatients: 5, inpatientTotal: 10000, gradedCompliant: 95, fallTotal: 100 },
];

export const fallMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fall-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fall-mgmt:read");
      if (denied) return denied;
      return json(ok({
        fallRiskAssessmentRate: computeFallRiskAssessmentRateV13(records),
        fallOccurrenceRate: computeFallOccurrenceRateV13(records),
        fallInjuryGradeRate: computeFallInjuryGradeRateV13(records),
      }));
    },
  },
];
