/**
 * 健澜科技 jlmedaios - 质控年度总结报告 V14 路由（M506-D，M506 收官）
 *
 * GET /api/v1/emr-qc-annual-summary-report  （read，auth:true）返回年度总结报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateAnnualReport,
  buildAnnualReport,
  type AnnualReportV14,
} from "../aggregators/emrQcAnnualSummaryReportV14Aggregator.js";

const sampleReports: AnnualReportV14[] = [
  buildAnnualReport(2025, 12000, 95),
  buildAnnualReport(2024, 11000, 92),
];

const aggregate = aggregateAnnualReport(sampleReports);

export const emrQcAnnualSummaryReportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-annual-summary-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-annual-summary-report:read");
      if (denied) return denied;
      return json(ok({ reports: sampleReports, aggregate }));
    },
  },
];
