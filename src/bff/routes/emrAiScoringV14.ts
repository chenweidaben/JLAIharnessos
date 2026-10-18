/**
 * 健澜科技 jlmedaios - 病历AI质控评分 V14 路由（M543-B）
 *
 * GET  /api/v1/emr-ai-scoring  （read，auth:true）返回 AI 评分基础数据
 * POST /api/v1/emr-ai-scoring  （auth:true）AI 质控评分 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiScoring,
  buildAiScoringReport,
  scoreByAi,
  type AiScoringInputV14,
} from "../aggregators/emrAiScoringV14Aggregator.js";

export const emrAiScoringV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-scoring",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-scoring:read");
      if (denied) return denied;
      const base = buildAiScoring("REC901", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-scoring",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-scoring:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiScoringInputV14 = {
        block: Number(obj?.block ?? 0),
        major: Number(obj?.major ?? 0),
        minor: Number(obj?.minor ?? 0),
      };
      const result = scoreByAi(input);
      const report = buildAiScoringReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
