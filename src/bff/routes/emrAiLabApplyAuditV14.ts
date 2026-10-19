/**
 * 健澜科技 jlmedaios - 病历AI检验申请合理性审查 V14 路由（M561-B）
 *
 * GET  /api/v1/emr-ai-lab-apply-audit  （read，auth:true）返回 AI 检验申请合理性审查基础数据
 * POST /api/v1/emr-ai-lab-apply-audit  （auth:true）AI 检验申请合理性审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiLabApplyAudit,
  buildAiLabApplyAuditReport,
  auditLabApplyByAi,
  type AiLabApplyAuditInputV14,
} from "../aggregators/emrAiLabApplyAuditV14Aggregator.js";

export const emrAiLabApplyAuditV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-lab-apply-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-apply-audit:read");
      if (denied) return denied;
      const base = buildAiLabApplyAudit("RECB067", "检验科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-lab-apply-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-lab-apply-audit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiLabApplyAuditInputV14 = {
        testName: String(obj?.testName ?? ""),
        patientAge: Number(obj?.patientAge ?? 0),
        hasResult: Boolean(obj?.hasResult ?? false),
      };
      const result = auditLabApplyByAi(input);
      const report = buildAiLabApplyAuditReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
