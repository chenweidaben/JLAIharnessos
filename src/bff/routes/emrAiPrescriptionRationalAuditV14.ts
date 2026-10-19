/**
 * 健澜科技 jlmedaios - 病历AI处方合理用药审查 V14 路由（M558-B）
 *
 * GET  /api/v1/emr-ai-prescription-rational-audit  （read，auth:true）返回 AI 处方合理用药审查基础数据
 * POST /api/v1/emr-ai-prescription-rational-audit  （auth:true）AI 处方合理用药审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiPrescriptionRationalAudit,
  buildAiPrescriptionRationalAuditReport,
  auditPrescriptionByAi,
  type AiPrescriptionRationalAuditInputV14,
} from "../aggregators/emrAiPrescriptionRationalAuditV14Aggregator.js";

export const emrAiPrescriptionRationalAuditV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-prescription-rational-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-prescription-rational-audit:read");
      if (denied) return denied;
      const base = buildAiPrescriptionRationalAudit("RECB055", "药剂科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-prescription-rational-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-prescription-rational-audit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiPrescriptionRationalAuditInputV14 = {
        drugName: String(obj?.drugName ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
        hasAllergy: Boolean(obj?.hasAllergy ?? false),
      };
      const result = auditPrescriptionByAi(input);
      const report = buildAiPrescriptionRationalAuditReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
