/**
 * 健澜科技 jlmedaios - 质控 AI 智能问答助手 V14 路由（M508-D，M508 收官）
 *
 * POST /api/v1/emr-qc-ai-qa-assistant  （auth:true）AI 问答提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  askQuestion,
  buildQaReport,
  type AiQaAssistantV14,
} from "../aggregators/emrQcAiQaAssistantV14Aggregator.js";

export const emrQcAiQaAssistantV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-qa-assistant",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-qa-assistant:write");
      if (denied) return denied;
      const body = await c.req.json();
      const question = typeof body?.question === "string" ? body.question : "";
      const result: AiQaAssistantV14 = askQuestion(question);
      const report = buildQaReport(question, result);
      return json(ok({ result, report }));
    },
  },
];
