/**
 * 健澜科技 jlmedaios - 病历质控报表中心 V14 路由（M478-D，M478 收官）
 *
 * GET  /api/v1/emr-qc-report-center           （read，auth:true）返回报表中心目录
 * POST /api/v1/emr-qc-report-center/generate （auth:true，body 用 await c.req.json()）生成报表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReportCenter,
  generateQcReport,
  type ReportItemV14,
} from "../aggregators/emrQcReportCenterV14Aggregator.js";

const demoReports: ReportItemV14[] = [
  { id: "R001", name: "日报", category: "日报" },
  { id: "R002", name: "周报", category: "周报" },
  { id: "R003", name: "月报", category: "月报" },
  { id: "R004", name: "年报", category: "年报" },
];

const demoCenter = buildReportCenter(demoReports);

export const emrQcReportCenterV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-report-center",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-report-center:read");
      if (denied) return denied;
      return json(ok({ center: demoCenter }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-report-center/generate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-report-center:write");
      if (denied) return denied;
      const body = await c.req.json() as { reportId?: string; dept?: string; period?: string };
      const report = generateQcReport(body.reportId ?? "R001", {
        dept: body.dept ?? "内科",
        period: body.period ?? "2026-10",
      });
      return json(ok({ report }));
    },
  },
];
