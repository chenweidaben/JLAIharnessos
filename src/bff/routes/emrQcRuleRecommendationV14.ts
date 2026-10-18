/**
 * 健澜科技 jlmedaios - 质控规则智能推荐 V14 路由（M520-A）
 *
 * GET  /api/v1/emr-qc-rule-recommendation  （read，auth:true）返回推荐基础数据
 * POST /api/v1/emr-qc-rule-recommendation  （auth:true）推荐规则 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleRecommendation,
  buildRuleRecommendationReport,
  recommendRules,
  type RecommendationContextV14,
} from "../aggregators/emrQcRuleRecommendationV14Aggregator.js";

export const emrQcRuleRecommendationV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rule-recommendation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-recommendation:read");
      if (denied) return denied;
      const recommendation = buildRuleRecommendation("心内科", "入院记录");
      return json(ok(recommendation));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rule-recommendation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-recommendation:write");
      if (denied) return denied;
      const body = await c.req.json();
      const context: RecommendationContextV14 = {
        dept: String(body?.context?.dept ?? "心内科"),
        recordType: String(body?.context?.recordType ?? "入院记录"),
      };
      const candidateRules: string[] = Array.isArray(body?.candidateRules) ? body.candidateRules.map((r: unknown) => String(r)) : [];
      const result = recommendRules(context, candidateRules);
      const report = buildRuleRecommendationReport(result);
      return json(ok({ context, candidateRules, result, report }));
    },
  },
];
