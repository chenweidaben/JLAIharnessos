/**
 * 健澜科技 jlmedaios - 宣传管理 V13 路由（M450-A，宣传与党建管理组）
 *
 * GET /api/v1/publicity-mgmt
 *
 * 权限：publicity-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePublicityActivityParticipationRateV13,
  computePublicityMediaReportCountV13,
  computePublicityPlanCompletionRateV13,
  type PublicityMgmtRecordV13,
} from "../aggregators/publicityMgmtV13Aggregator.js";

const records: PublicityMgmtRecordV13[] = [
  { completed: 950, planned: 1000, mediaReportCount: 50, participated: 900, shouldParticipate: 1000 },
  { completed: 950, planned: 1000, mediaReportCount: 50, participated: 900, shouldParticipate: 1000 },
];

export const publicityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/publicity-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "publicity-mgmt:read");
      if (denied) return denied;
      return json(ok({
        publicityPlanCompletionRate: computePublicityPlanCompletionRateV13(records),
        publicityMediaReportCount: computePublicityMediaReportCountV13(records),
        publicityActivityParticipationRate: computePublicityActivityParticipationRateV13(records),
      }));
    },
  },
];
