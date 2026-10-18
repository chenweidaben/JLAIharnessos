/**
 * 健澜科技 jlmedaios - 病历AI质控风险评分 V14 路由（M549-C）
 *
 * GET  /api/v1/emr-ai-qc-risk-score  （read，auth:true）返回 AI 风险评分基础数据
 * POST /api/v1/emr-ai-qc-risk-score  （auth:true）AI 风险评分 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcRiskScore,
  buildAiQcRiskScoreReport,
  scoreQcRiskByAi,
  type AiQcRiskScoreInputV14,
} from "../aggregators/emrAiQcRiskScoreV14Aggregator.js";

export const emrAiQcRiskScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-risk-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-risk-score:read");
      if (denied) return denied;
      const base = buildAiQcRiskScore("RECB019", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-risk-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-risk-score:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcRiskScoreInputV14 = {
        blockCount: Number(obj?.blockCount ?? 0),
        majorCount: Number(obj?.majorCount ?? 0),
        minorCount: Number(obj?.minorCount ?? 0),
      };
      const result = scoreQcRiskByAi(input);
      const report = buildAiQcRiskScoreReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
