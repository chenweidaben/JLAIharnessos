/**
 * 健澜科技 jlmedaios - 病历质量评分汇总 V14 路由（M481-D，M481 收官，-summary 避让 M465-B emrQualityScoreV14）
 *
 * GET /api/v1/emr-quality-score-summary  （read，auth:true）返回质量评分汇总
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateQualityScore, buildQualityScore, type QualityScoreSummaryV14 } from "../aggregators/emrQualityScoreSummaryV14Aggregator.js";

const demoScores: QualityScoreSummaryV14[] = [
  buildQualityScore("内科", 80),
  buildQualityScore("内科", 90),
  buildQualityScore("外科", 85),
  buildQualityScore("外科", 95),
];

const demoAggregated = aggregateQualityScore(demoScores);

export const emrQualityScoreSummaryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quality-score-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-score-summary:read");
      if (denied) return denied;
      return json(ok({ scores: demoScores, aggregated: demoAggregated }));
    },
  },
];
