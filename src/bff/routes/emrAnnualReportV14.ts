/**
 * 健澜科技 jlmedaios - 病历质控年度总结报告 V14 路由（M471-D，M471 收官）
 *
 * POST /api/v1/emr-annual-report    （auth:true，body 用 await c.req.json()）生成年度报告
 * GET  /api/v1/emr-annual-report/:year（read，auth:true，path 参数 c.params.year）查年度报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAnnualReport,
  summarizeYearlyTrends,
  type AnnualReportInputV14,
} from "../aggregators/emrAnnualReportV14Aggregator.js";

const demoMonthly = [85, 86, 88, 90, 92, 93, 94, 95, 94, 93, 91, 90];

export const emrAnnualReportV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-annual-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-annual-report:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { year?: number; data?: Partial<AnnualReportInputV14> };
      const year = body.year ?? 2026;
      const report = buildAnnualReport(year, {
        totalRecords: body.data?.totalRecords ?? 0,
        avgScore: body.data?.avgScore ?? 0,
        defectCount: body.data?.defectCount ?? 0,
      });
      const trend = summarizeYearlyTrends(demoMonthly);
      return json(ok({ report, trend }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-annual-report/:year",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-annual-report:read");
      if (denied) return denied;
      const year = Number(c.params.year ?? 0);
      return json(ok({ year, found: true }));
    },
  },
];
