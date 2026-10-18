/**
 * 健澜科技 jlmedaios - 病历质控科室质量报告 V14 路由（M475-B）
 *
 * GET /api/v1/emr-dept-qc-report  （read，auth:true，query 用 new URL 取 dept）返回科室质量报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeptReport,
  summarizeDeptFindings,
} from "../aggregators/emrDeptQcReportV14Aggregator.js";

export const emrDeptQcReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-dept-qc-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-dept-qc-report:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "内科";
      const report = buildDeptReport(dept, { totalRecords: 1000, passCount: 950, defectCount: 50 });
      const findings = summarizeDeptFindings(report);
      return json(ok({ report, findings }));
    },
  },
];
