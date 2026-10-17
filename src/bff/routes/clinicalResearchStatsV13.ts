/**
 * 健澜科技 jlmedaios - 临床研究 V13 路由（M355-B，stats 避让已有 clinicalResearchV13）
 *
 * GET /api/v1/clinical-research-stats
 *
 * 权限：clinical-research-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEthicsReviewCountV13,
  computeGcpProjectCountV13,
  computeSciPaperCountV13,
  type ClinicalResearchStatsRecordV13,
} from "../aggregators/clinicalResearchStatsV13Aggregator.js";

const records: ClinicalResearchStatsRecordV13[] = [
  { gcpProjectCount: 5, ethicsReviewCount: 20, sciPaperCount: 8 },
  { gcpProjectCount: 5, ethicsReviewCount: 30, sciPaperCount: 12 },
];

export const clinicalResearchStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-research-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-research-stats:read");
      if (denied) return denied;
      return json(ok({
        gcpProjectCount: computeGcpProjectCountV13(records),
        ethicsReviewCount: computeEthicsReviewCountV13(records),
        sciPaperCount: computeSciPaperCountV13(records),
      }));
    },
  },
];
