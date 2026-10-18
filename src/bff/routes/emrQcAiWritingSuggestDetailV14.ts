/**
 * 健澜科技 jlmedaios - 质控 AI 辅助书写建议明细 V14 路由（M508-B，-detail 避让）
 *
 * POST /api/v1/emr-qc-ai-writing-suggest-detail  （auth:true）AI 建议提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSuggestReport,
  suggestWriting,
  type AiWritingSuggestResultDetailV14,
} from "../aggregators/emrQcAiWritingSuggestDetailV14Aggregator.js";

export const emrQcAiWritingSuggestDetailV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-writing-suggest-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-writing-suggest-detail:write");
      if (denied) return denied;
      const body = await c.req.json();
      const dept = typeof body?.dept === "string" ? body.dept : "";
      const section = typeof body?.section === "string" ? body.section : "";
      const result: AiWritingSuggestResultDetailV14 = suggestWriting(dept, section);
      const report = buildSuggestReport(dept, section, result);
      return json(ok({ result, report }));
    },
  },
];
