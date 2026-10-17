/**
 * 健澜科技 jlmedaios - 满意度调查明细 V13 路由（M400-B，避让旧版 satisfaction-survey）
 *
 * GET /api/v1/satisfaction-survey-detail
 *
 * 权限：satisfaction-survey-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCaregiverSatisfactionRateV13,
  computeInpatientSatisfactionRateV13,
  computeOutpatientSatisfactionRateV13,
  type SatisfactionSurveyDetailRecordV13,
} from "../aggregators/satisfactionSurveyDetailV13Aggregator.js";

const records: SatisfactionSurveyDetailRecordV13[] = [
  { outpatientSatisfied: 900, outpatientTotal: 1000, inpatientSatisfied: 850, inpatientTotal: 1000, caregiverSatisfied: 950, caregiverTotal: 1000 },
  { outpatientSatisfied: 900, outpatientTotal: 1000, inpatientSatisfied: 850, inpatientTotal: 1000, caregiverSatisfied: 950, caregiverTotal: 1000 },
];

export const satisfactionSurveyDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/satisfaction-survey-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "satisfaction-survey-detail:read");
      if (denied) return denied;
      return json(ok({
        outpatientSatisfactionRate: computeOutpatientSatisfactionRateV13(records),
        inpatientSatisfactionRate: computeInpatientSatisfactionRateV13(records),
        caregiverSatisfactionRate: computeCaregiverSatisfactionRateV13(records),
      }));
    },
  },
];
