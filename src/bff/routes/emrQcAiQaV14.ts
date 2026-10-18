/**
 * 健澜科技 jlmedaios - 质控 AI 知识问答 V14 路由（M499-D）
 *
 * POST /api/v1/emr-qc-ai-qa  （auth:true）知识问答提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { answerQuestion, buildQaReport } from "../aggregators/emrQcAiQaV14Aggregator.js";

export const emrQcAiQaV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-ai-qa",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ai-qa:write");
      if (denied) return denied;
      const body = await c.req.json();
      const question = typeof body?.question === "string" ? body.question : "";
      const result = answerQuestion(question);
      const report = buildQaReport(result, question);
      return json(ok({ result, report }));
    },
  },
];
