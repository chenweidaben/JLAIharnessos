/**
 * 健澜科技 jlmedaios - 管路滑脱风险管理 V13 路由（M439-D，M439 收官，患者安全与医疗风险管理组）
 *
 * GET /api/v1/tube-dislodgement
 *
 * 权限：tube-dislodgement:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTubeDislodgementHighRiskAssessmentRateV13,
  computeTubeDislodgementRateV13,
  computeTubeDislodgementReportingRateV13,
  type TubeDislodgementRecordV13,
} from "../aggregators/tubeDislodgementV13Aggregator.js";

const records: TubeDislodgementRecordV13[] = [
  { dislodgedTubes: 20, totalTubeDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, reportedDislodgement: 950, totalDislodgement: 1000 },
  { dislodgedTubes: 20, totalTubeDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, reportedDislodgement: 950, totalDislodgement: 1000 },
];

export const tubeDislodgementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/tube-dislodgement",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "tube-dislodgement:read");
      if (denied) return denied;
      return json(ok({
        tubeDislodgementRate: computeTubeDislodgementRateV13(records),
        tubeDislodgementHighRiskAssessmentRate: computeTubeDislodgementHighRiskAssessmentRateV13(records),
        tubeDislodgementReportingRate: computeTubeDislodgementReportingRateV13(records),
      }));
    },
  },
];
