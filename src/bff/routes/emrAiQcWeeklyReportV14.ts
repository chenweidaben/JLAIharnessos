/**
 * 健澜科技 jlmedaios - 病历AI质控周报生成 V14 路由（M548-A）
 *
 * GET  /api/v1/emr-ai-qc-weekly-report  （read，auth:true）返回 AI 质控周报基础数据
 * POST /api/v1/emr-ai-qc-weekly-report  （auth:true）AI 质控周报生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcWeeklyReport,
  buildAiQcWeeklyReportReport,
  generateQcWeeklyReportByAi,
  type AiQcWeeklyReportInputV14,
} from "../aggregators/emrAiQcWeeklyReportV14Aggregator.js";

export const emrAiQcWeeklyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-weekly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-weekly-report:read");
      if (denied) return denied;
      const base = buildAiQcWeeklyReport("RECB013", "内科");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-weekly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-weekly-report:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcWeeklyReportInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        defectCount: Number(obj?.defectCount ?? 0),
      };
      const result = generateQcWeeklyReportByAi(input);
      const report = buildAiQcWeeklyReportReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
