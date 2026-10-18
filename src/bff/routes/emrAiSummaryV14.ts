/**
 * 健澜科技 jlmedaios - AI 病历摘要生成 V14 路由（M486-A）
 *
 * POST /api/v1/emr-ai-summary  （auth:true，body 用 await c.req.json()）返回 AI 摘要结果
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { generateAiSummary, buildSummaryReport } from "../aggregators/emrAiSummaryV14Aggregator.js";

export const emrAiSummaryV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-ai-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-summary:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        content?: string;
      };
      const content = body.content ?? "";
      const result = generateAiSummary(content);
      const report = buildSummaryReport(result);
      return json(ok({ result, report }));
    },
  },
];
