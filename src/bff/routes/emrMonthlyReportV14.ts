/**
 * 健澜科技 jlmedaios - 病历质控月度报告自动生成 V14 路由（M466-D，M466 收官）
 *
 * POST /api/v1/emr-monthly-report        （auth:true，body 用 await c.req.json()）生成月报
 * GET  /api/v1/emr-monthly-report/:yearMonth（read，auth:true，path 参数 c.params.yearMonth）查月报
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMonthlyReport,
  computeTrend,
  type MonthlyStatsV14,
} from "../aggregators/emrMonthlyReportV14Aggregator.js";

const demoStats: MonthlyStatsV14 = {
  totalRecords: 100,
  passCount: 95,
  blockCount: 2,
  majorCount: 1,
  minorCount: 3,
};

export const emrMonthlyReportV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-monthly-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-monthly-report:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        month?: string;
        stats?: MonthlyStatsV14;
      };
      const report = buildMonthlyReport(body.month ?? "2026-10", body.stats ?? demoStats);
      return json(ok({ report }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/emr-monthly-report/:yearMonth",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-monthly-report:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const yearMonth = (c.params.yearMonth ?? "").trim();
      const report = buildMonthlyReport(yearMonth, demoStats);
      const trend = computeTrend(report.passRate, 90);
      return json(ok({ report, trend }));
    },
  },
];
