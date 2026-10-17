/**
 * 健澜科技 jlmedaios - 继续教育明细 V13 路由（M397-D，M397 收官，避让旧版 continuingEducationV13/continuingEducationStatsV13）
 *
 * GET /api/v1/continuing-education-detail
 *
 * 权限：continuing-education-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeContinuingEducationCreditComplianceRateV13,
  computeContinuingEducationProjectCountV13,
  computeOutboundTrainingCountV13,
  type ContinuingEducationDetailRecordV13,
} from "../aggregators/continuingEducationDetailV13Aggregator.js";

const records: ContinuingEducationDetailRecordV13[] = [
  { projectCount: 10, compliantCount: 95, totalCount: 100, outboundCount: 5 },
  { projectCount: 10, compliantCount: 95, totalCount: 100, outboundCount: 5 },
];

export const continuingEducationDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-education-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-education-detail:read");
      if (denied) return denied;
      return json(ok({
        continuingEducationProjectCount: computeContinuingEducationProjectCountV13(records),
        continuingEducationCreditComplianceRate: computeContinuingEducationCreditComplianceRateV13(records),
        outboundTrainingCount: computeOutboundTrainingCountV13(records),
      }));
    },
  },
];
