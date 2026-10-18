/**
 * 健澜科技 jlmedaios - 病历AI质控年报生成 V14 路由（M548-D，M548 收官）
 *
 * GET  /api/v1/emr-ai-qc-annual-report  （read，auth:true）返回 AI 质控年报基础数据
 * POST /api/v1/emr-ai-qc-annual-report  （auth:true）AI 质控年报生成 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcAnnualReport,
  buildAiQcAnnualReportReport,
  generateQcAnnualReportByAi,
  type AiQcAnnualReportInputV14,
} from "../aggregators/emrAiQcAnnualReportV14Aggregator.js";

export const emrAiQcAnnualReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-annual-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-annual-report:read");
      if (denied) return denied;
      const base = buildAiQcAnnualReport("RECB016", "院领导");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-annual-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-annual-report:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcAnnualReportInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        defectCount: Number(obj?.defectCount ?? 0),
        bestDept: String(obj?.bestDept ?? ""),
        worstDept: String(obj?.worstDept ?? ""),
      };
      const result = generateQcAnnualReportByAi(input);
      const report = buildAiQcAnnualReportReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
