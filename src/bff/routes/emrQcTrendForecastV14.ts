/**
 * 健澜科技 jlmedaios - 质控缺陷趋势预测 V14 路由（M495-A）
 *
 * GET /api/v1/emr-qc-trend-forecast  （read，auth:true）返回趋势预测数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { forecastDefectTrend, buildTrendForecastReport } from "../aggregators/emrQcTrendForecastV14Aggregator.js";

const sampleHistory = [
  { month: "2026-01", defects: 10 },
  { month: "2026-02", defects: 8 },
  { month: "2026-03", defects: 6 },
];

export const emrQcTrendForecastV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-trend-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-trend-forecast:read");
      if (denied) return denied;
      const result = forecastDefectTrend(sampleHistory);
      const report = buildTrendForecastReport(result);
      return json(ok({ result, report }));
    },
  },
];
