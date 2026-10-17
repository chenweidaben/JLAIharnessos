/**
 * 健澜科技 jlmedaios - 科研项目统计 V13 路由（M383-A，stats 避让）
 *
 * GET /api/v1/research-project-stats
 *
 * 权限：research-project-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeActiveResearchProjectCountV13,
  computeAnnualPaperCountV13,
  computeResearchFundingAmountV13,
  type ResearchProjectRecordV13,
} from "../aggregators/researchProjectStatsV13Aggregator.js";

const records: ResearchProjectRecordV13[] = [
  { activeProjectCount: 20, fundingAmount: 500, annualPaperCount: 100 },
  { activeProjectCount: 20, fundingAmount: 500, annualPaperCount: 100 },
];

export const researchProjectStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-project-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-project-stats:read");
      if (denied) return denied;
      return json(ok({
        activeResearchProjectCount: computeActiveResearchProjectCountV13(records),
        researchFundingAmount: computeResearchFundingAmountV13(records),
        annualPaperCount: computeAnnualPaperCountV13(records),
      }));
    },
  },
];
