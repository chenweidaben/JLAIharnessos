/**
 * 健澜科技 jlmedaios - 病历AI费用合理性审查 V14 路由（M552-C）
 *
 * GET  /api/v1/emr-ai-cost-rational-audit  （read，auth:true）返回 AI 费用合理性审查基础数据
 * POST /api/v1/emr-ai-cost-rational-audit  （auth:true）AI 费用合理性审查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiCostRationalAudit,
  buildAiCostRationalAuditReport,
  auditCostRationalByAi,
  type AiCostRationalAuditInputV14,
} from "../aggregators/emrAiCostRationalAuditV14Aggregator.js";

export const emrAiCostRationalAuditV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-cost-rational-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-cost-rational-audit:read");
      if (denied) return denied;
      const base = buildAiCostRationalAudit("RECB031", "医保办");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-cost-rational-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-cost-rational-audit:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiCostRationalAuditInputV14 = {
        actualCost: Number(obj?.actualCost ?? 0),
        expectedCost: Number(obj?.expectedCost ?? 0),
      };
      const result = auditCostRationalByAi(input);
      const report = buildAiCostRationalAuditReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
