/**
 * 健澜科技 jlmedaios - 病历AI病案质量评分 V14 路由（M556-B）
 *
 * GET  /api/v1/emr-ai-record-quality-score  （read，auth:true）返回 AI 病案质量评分基础数据
 * POST /api/v1/emr-ai-record-quality-score  （auth:true）AI 病案质量评分 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRecordQualityScore,
  buildAiRecordQualityScoreReport,
  scoreRecordQualityByAi,
  type AiRecordQualityScoreInputV14,
} from "../aggregators/emrAiRecordQualityScoreV14Aggregator.js";

export const emrAiRecordQualityScoreV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-record-quality-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-quality-score:read");
      if (denied) return denied;
      const base = buildAiRecordQualityScore("RECB046", "病案室");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-record-quality-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-record-quality-score:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRecordQualityScoreInputV14 = {
        completeness: Number(obj?.completeness ?? 0),
        accuracy: Number(obj?.accuracy ?? 0),
        timeliness: Number(obj?.timeliness ?? 0),
      };
      const result = scoreRecordQualityByAi(input);
      const report = buildAiRecordQualityScoreReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
