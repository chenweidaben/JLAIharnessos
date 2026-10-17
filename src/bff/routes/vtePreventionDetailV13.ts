/**
 * 健澜科技 jlmedaios - VTE 预防管理（细节）V13 路由（M422-A，detail 避让旧版 vtePreventionMgmtV13）
 *
 * GET /api/v1/vte-prevention-detail
 *
 * 权限：vte-prevention-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMechanicalPreventionUsageRateV13,
  computePharmaceuticalPreventionUsageRateV13,
  computeVteRiskAssessmentRateV13,
  type VtePreventionDetailRecordV13,
} from "../aggregators/vtePreventionDetailV13Aggregator.js";

const records: VtePreventionDetailRecordV13[] = [
  { assessed: 950, shouldAssess: 1000, mechanicalUsed: 800, pharmaceuticalUsed: 700, highRiskTotal: 1000 },
  { assessed: 950, shouldAssess: 1000, mechanicalUsed: 800, pharmaceuticalUsed: 700, highRiskTotal: 1000 },
];

export const vtePreventionDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/vte-prevention-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "vte-prevention-detail:read");
      if (denied) return denied;
      return json(ok({
        vteRiskAssessmentRate: computeVteRiskAssessmentRateV13(records),
        mechanicalPreventionUsageRate: computeMechanicalPreventionUsageRateV13(records),
        pharmaceuticalPreventionUsageRate: computePharmaceuticalPreventionUsageRateV13(records),
      }));
    },
  },
];
