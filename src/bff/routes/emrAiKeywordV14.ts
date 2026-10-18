/**
 * 健澜科技 jlmedaios - AI 病历关键词提取 V14 路由（M486-B）
 *
 * POST /api/v1/emr-ai-keyword  （auth:true，body 用 await c.req.json()）返回关键词提取结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { extractAiKeywords, buildKeywordReport } from "../aggregators/emrAiKeywordV14Aggregator.js";

export const emrAiKeywordV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-ai-keyword",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-keyword:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = extractAiKeywords(content);
      const report = buildKeywordReport(result);
      return json(ok({ result, report }));
    },
  },
];
