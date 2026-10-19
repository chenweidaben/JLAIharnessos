/**
 * 健澜科技 jlmedaios - 病历AI用药咨询答复 V14 路由（M565-B）
 *
 * GET  /api/v1/emr-ai-medication-consult-reply  （read，auth:true）返回 AI 用药咨询答复基础数据
 * POST /api/v1/emr-ai-medication-consult-reply  （auth:true）AI 用药咨询答复 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiMedicationConsultReply,
  buildAiMedicationConsultReplyReport,
  replyMedicationConsultByAi,
  type AiMedicationConsultReplyInputV14,
} from "../aggregators/emrAiMedicationConsultReplyV14Aggregator.js";

export const emrAiMedicationConsultReplyV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-medication-consult-reply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-medication-consult-reply:read");
      if (denied) return denied;
      const base = buildAiMedicationConsultReply("RECB083", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-medication-consult-reply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-medication-consult-reply:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiMedicationConsultReplyInputV14 = {
        question: String(obj?.question ?? ""),
        drugName: String(obj?.drugName ?? ""),
      };
      const result = replyMedicationConsultByAi(input);
      const report = buildAiMedicationConsultReplyReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
