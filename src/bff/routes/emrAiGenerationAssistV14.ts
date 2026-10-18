/**
 * 健澜科技 jlmedaios - AI病历生成辅助 V14 路由（M522-A）
 *
 * GET  /api/v1/emr-ai-generation-assist  （read，auth:true）返回生成辅助基础数据
 * POST /api/v1/emr-ai-generation-assist  （auth:true）生成病历草稿 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiGenerationAssist,
  buildAiGenerationReport,
  generateMedicalRecordDraft,
  type AiGenerationContextV14,
} from "../aggregators/emrAiGenerationAssistV14Aggregator.js";

export const emrAiGenerationAssistV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-generation-assist",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-generation-assist:read");
      if (denied) return denied;
      const assist = buildAiGenerationAssist("入院记录", "心内科");
      return json(ok(assist));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-generation-assist",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-generation-assist:write");
      if (denied) return denied;
      const body = await c.req.json();
      const context: AiGenerationContextV14 = {
        recordType: String(body?.recordType ?? "入院记录"),
        dept: String(body?.dept ?? "心内科"),
        symptoms: Array.isArray(body?.symptoms) ? body.symptoms.map((s: unknown) => String(s)) : [],
      };
      const result = generateMedicalRecordDraft(context);
      const report = buildAiGenerationReport(result);
      return json(ok({ context, result, report }));
    },
  },
];
