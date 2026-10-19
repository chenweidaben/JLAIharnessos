/**
 * 健澜科技 jlmedaios - 病历AI检查报告AI解读摘要 V14 路由（M561-C）
 *
 * GET  /api/v1/emr-ai-exam-report-summary  （read，auth:true）返回 AI 检查报告AI解读摘要基础数据
 * POST /api/v1/emr-ai-exam-report-summary  （auth:true）AI 检查报告AI解读摘要 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiExamReportSummary,
  buildAiExamReportSummaryReport,
  summarizeExamReportByAi,
  type AiExamReportSummaryInputV14,
} from "../aggregators/emrAiExamReportSummaryV14Aggregator.js";

export const emrAiExamReportSummaryV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-exam-report-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-exam-report-summary:read");
      if (denied) return denied;
      const base = buildAiExamReportSummary("RECB068", "放射科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-exam-report-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-exam-report-summary:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiExamReportSummaryInputV14 = {
        examType: String(obj?.examType ?? ""),
        findings: String(obj?.findings ?? ""),
      };
      const result = summarizeExamReportByAi(input);
      const report = buildAiExamReportSummaryReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
