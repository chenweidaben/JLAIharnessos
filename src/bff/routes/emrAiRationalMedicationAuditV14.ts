/**
 * 健澜科技 jlmedaios - 病历AI合理用药审查 V14 路由（M554-B）
 *
 * GET  /api/v1/emr-ai-rational-medication-audit  （read，auth:true）返回 AI 合理用药审查基础数据
 * POST /api/v1/emr-ai-rational-medication-audit  （auth:true）AI 合理用药审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiRationalMedicationAudit,
  buildAiRationalMedicationAuditReport,
  auditRationalMedicationByAi,
  type AiRationalMedicationAuditInputV14,
} from "../aggregators/emrAiRationalMedicationAuditV14Aggregator.js";

export const emrAiRationalMedicationAuditV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-rational-medication-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-rational-medication-audit:read");
      if (denied) return denied;
      const base = buildAiRationalMedicationAudit("RECB038", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-rational-medication-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-rational-medication-audit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiRationalMedicationAuditInputV14 = {
        drugName: String(obj?.drugName ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
        hasAllergy: Boolean(obj?.hasAllergy ?? false),
      };
      const result = auditRationalMedicationByAi(input);
      const report = buildAiRationalMedicationAuditReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
