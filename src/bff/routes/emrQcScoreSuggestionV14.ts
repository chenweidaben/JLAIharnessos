/**
 * 健澜科技 jlmedaios - 质控评分改进建议 V14 路由（M492-D，M492 收官）
 *
 * POST /api/v1/emr-qc-score-suggestion  （auth:true，body 用 await c.req.json()）返回改进建议
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { generateScoreSuggestion, buildSuggestionReport } from "../aggregators/emrQcScoreSuggestionV14Aggregator.js";

export const emrQcScoreSuggestionV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-score-suggestion",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-score-suggestion:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        score?: number;
      };
      const score = body.score ?? 0;
      const suggestion = generateScoreSuggestion(score);
      const report = buildSuggestionReport(suggestion);
      return json(ok({ suggestion, report }));
    },
  },
];
