/**
 * 健澜科技 jlmedaios - 质控 AI 书写建议 V14 路由（M499-B）
 *
 * POST /api/v1/emr-qc-ai-writing-suggest  （auth:true）书写建议提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSuggestReport, suggestWriting } from "../aggregators/emrQcAiWritingSuggestV14Aggregator.js";

export const emrQcAiWritingSuggestV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-writing-suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-writing-suggest:write");
      if (denied) return denied;
      const body = await c.req.json();
      const context = typeof body?.context === "string" ? body.context : "";
      const result = suggestWriting(context);
      const report = buildSuggestReport(result);
      return json(ok({ result, report }));
    },
  },
];
