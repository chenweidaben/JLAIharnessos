/**
 * 健澜科技 jlmedaios - 病历 AI 辅助书写实时建议 V14 路由（M467-B）
 *
 * POST /api/v1/emr-ai-assistant/suggest  （auth:true，body 用 await c.req.json()）实时建议
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  generateSuggestions,
  rankSuggestions,
} from "../aggregators/emrAiAssistantV14Aggregator.js";

export const emrAiAssistantV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-ai-assistant/suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-assistant:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { context?: string };
      const raw = generateSuggestions(body.context ?? "");
      const ranked = rankSuggestions(raw);
      return json(ok({ suggestions: ranked }));
    },
  },
];
