/**
 * 健澜科技 jlmedaios - 病历AI出院小结生成 V14 路由（M547-A）
 *
 * GET  /api/v1/emr-ai-discharge-summary  （read，auth:true）返回 AI 出院小结基础数据
 * POST /api/v1/emr-ai-discharge-summary  （auth:true）AI 出院小结生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiDischargeSummary,
  buildAiDischargeSummaryReport,
  generateDischargeSummaryByAi,
  type AiDischargeSummaryInputV14,
} from "../aggregators/emrAiDischargeSummaryV14Aggregator.js";

export const emrAiDischargeSummaryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-discharge-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-summary:read");
      if (denied) return denied;
      const base = buildAiDischargeSummary("RECB009", "心内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-discharge-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-discharge-summary:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiDischargeSummaryInputV14 = {
        diagnosis: String(obj?.diagnosis ?? ""),
        treatment: String(obj?.treatment ?? ""),
      };
      const result = generateDischargeSummaryByAi(input);
      const report = buildAiDischargeSummaryReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
