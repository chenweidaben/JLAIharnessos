/**
 * 健澜科技 jlmedaios - 出院小结质量评分 V13 路由（M314-D）
 *
 * GET /api/v1/discharge-summary-quality?patientId=
 *
 * 权限：discharge-summary-quality:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSummaryQualityScoreV13,
  gradeSummaryQualityV13,
  identifySummaryDeficiencyV13,
  type DischargeSummaryV13,
} from "../aggregators/dischargeSummaryQualityV13Aggregator.js";

const summary: DischargeSummaryV13 = {
  completeness: 90,
  wordCount: 80,
  icdCompleteness: 85,
  medConsistency: 90,
};

export const dischargeSummaryQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discharge-summary-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discharge-summary-quality:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const patientId = url.searchParams.get("patientId") ?? "p1";
      const score = computeSummaryQualityScoreV13(summary);
      return json(ok({
        patientId,
        score,
        grade: gradeSummaryQualityV13(score),
        dims: summary,
        deficiencies: identifySummaryDeficiencyV13(score, summary),
      }));
    },
  },
];
