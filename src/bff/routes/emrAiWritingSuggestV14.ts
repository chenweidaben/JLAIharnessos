/**
 * 健澜科技 jlmedaios - 病历AI病历书写建议 V14 路由（M553-A）
 *
 * GET  /api/v1/emr-ai-writing-suggest  （read，auth:true）返回 AI 病历书写建议基础数据
 * POST /api/v1/emr-ai-writing-suggest  （auth:true）AI 病历书写建议 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiWritingSuggest,
  buildAiWritingSuggestReport,
  suggestWritingByAi,
  type AiWritingSuggestInputV14,
} from "../aggregators/emrAiWritingSuggestV14Aggregator.js";

export const emrAiWritingSuggestV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-writing-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-writing-suggest:read");
      if (denied) return denied;
      const base = buildAiWritingSuggest("RECB033", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-writing-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-writing-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiWritingSuggestInputV14 = {
        recordType: String(obj?.recordType ?? ""),
        hasChiefComplaint: Boolean(obj?.hasChiefComplaint ?? false),
      };
      const result = suggestWritingByAi(input);
      const report = buildAiWritingSuggestReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
