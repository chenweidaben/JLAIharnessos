/**
 * 健澜科技 jlmedaios - 病历AI生成建议 V14 路由（M543-A）
 *
 * GET  /api/v1/emr-ai-suggestion  （read，auth:true）返回 AI 建议基础数据
 * POST /api/v1/emr-ai-suggestion  （auth:true）AI 生成建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiSuggestion,
  buildAiSuggestionReport,
  generateAiSuggestion,
  type AiSuggestionInputV14,
} from "../aggregators/emrAiSuggestionV14Aggregator.js";

export const emrAiSuggestionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-suggestion",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-suggestion:read");
      if (denied) return denied;
      const base = buildAiSuggestion("REC900", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-suggestion",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-suggestion:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiSuggestionInputV14 = {
        recordType: String(obj?.recordType ?? ""),
        symptom: String(obj?.symptom ?? ""),
      };
      const result = generateAiSuggestion(input);
      const report = buildAiSuggestionReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
