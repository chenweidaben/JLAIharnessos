/**
 * 健澜科技 jlmedaios - 病历AI质控月报生成 V14 路由（M548-B）
 *
 * GET  /api/v1/emr-ai-qc-monthly-report  （read，auth:true）返回 AI 质控月报基础数据
 * POST /api/v1/emr-ai-qc-monthly-report  （auth:true）AI 质控月报生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcMonthlyReport,
  buildAiQcMonthlyReportReport,
  generateQcMonthlyReportByAi,
  type AiQcMonthlyReportInputV14,
} from "../aggregators/emrAiQcMonthlyReportV14Aggregator.js";

export const emrAiQcMonthlyReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-monthly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-monthly-report:read");
      if (denied) return denied;
      const base = buildAiQcMonthlyReport("RECB014", "医务处");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-monthly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-monthly-report:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcMonthlyReportInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        defectCount: Number(obj?.defectCount ?? 0),
        deptCount: Number(obj?.deptCount ?? 0),
      };
      const result = generateQcMonthlyReportByAi(input);
      const report = buildAiQcMonthlyReportReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
