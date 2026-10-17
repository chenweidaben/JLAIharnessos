/**
 * 健澜科技 jlmedaios - 临床研究明细 V13 路由（M397-C，避让旧版 clinicalResearchV13/clinicalResearchStatsV13）
 *
 * GET /api/v1/clinical-research-detail
 *
 * 权限：clinical-research-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalTrialProjectCountV13,
  computeEthicsReviewProjectCountV13,
  computeInvestigatorInitiatedResearchCountV13,
  type ClinicalResearchDetailRecordV13,
} from "../aggregators/clinicalResearchDetailV13Aggregator.js";

const records: ClinicalResearchDetailRecordV13[] = [
  { trialCount: 10, investigatorCount: 5, ethicsCount: 15 },
  { trialCount: 10, investigatorCount: 5, ethicsCount: 15 },
];

export const clinicalResearchDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-research-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-research-detail:read");
      if (denied) return denied;
      return json(ok({
        clinicalTrialProjectCount: computeClinicalTrialProjectCountV13(records),
        investigatorInitiatedResearchCount: computeInvestigatorInitiatedResearchCountV13(records),
        ethicsReviewProjectCount: computeEthicsReviewProjectCountV13(records),
      }));
    },
  },
];
