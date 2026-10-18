/**
 * 健澜科技 jlmedaios - 病历AI质控季报生成 V14 路由（M548-C）
 *
 * GET  /api/v1/emr-ai-qc-quarterly-report  （read，auth:true）返回 AI 质控季报基础数据
 * POST /api/v1/emr-ai-qc-quarterly-report  （auth:true）AI 质控季报生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcQuarterlyReport,
  buildAiQcQuarterlyReportReport,
  generateQcQuarterlyReportByAi,
  type AiQcQuarterlyReportInputV14,
} from "../aggregators/emrAiQcQuarterlyReportV14Aggregator.js";

export const emrAiQcQuarterlyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-quarterly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-quarterly-report:read");
      if (denied) return denied;
      const base = buildAiQcQuarterlyReport("RECB015", "医务处");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-quarterly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-quarterly-report:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcQuarterlyReportInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        defectCount: Number(obj?.defectCount ?? 0),
        topDept: String(obj?.topDept ?? ""),
      };
      const result = generateQcQuarterlyReportByAi(input);
      const report = buildAiQcQuarterlyReportReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
