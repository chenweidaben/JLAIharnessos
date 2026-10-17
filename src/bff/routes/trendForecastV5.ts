/**
 * 健澜科技 jlmedaios - 趋势预测与经营预警 V5 路由（M287-D）
 *
 * GET  /api/v1/trend-forecast 列表
 * GET  /api/v1/trend-forecast/:metric 详情
 * POST /api/v1/trend-forecast/alert 写预警
 *
 * 权限：trend-forecast:read / trend-forecast:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTrendReportV5,
  detectAnomalyV5,
  forecastTrendV5,
  type TrendPoint,
} from "../aggregators/trendForecastV5Aggregator.js";

interface MetricSeries {
  metric: string;
  history: TrendPoint[];
  uppers: number[];
}

const seriesStore: MetricSeries[] = [
  {
    metric: "门诊量",
    history: [
      { date: "2026-10-14", actual: 8800 },
      { date: "2026-10-15", actual: 9000 },
      { date: "2026-10-16", actual: 9200 },
    ],
    uppers: [9500, 9500, 9500],
  },
  {
    metric: "医疗收入",
    history: [
      { date: "2026-10-14", actual: 4600 },
      { date: "2026-10-15", actual: 4700 },
      { date: "2026-10-16", actual: 5200 },
    ],
    uppers: [5000, 5000, 5000],
  },
];

export const trendForecastV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/trend-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "trend-forecast:read");
      if (denied) return denied;

      return json(ok(seriesStore.map((s) => buildTrendReportV5(s.metric, s.history, s.uppers))));
    },
  },
  {
    method: "GET",
    path: "/api/v1/trend-forecast/:metric",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "trend-forecast:read");
      if (denied) return denied;

      const metric = c.params.metric;
      const series = seriesStore.find((s) => s.metric === metric);
      if (!series) {
        return json(ok({ found: false }));
      }
      const f = forecastTrendV5(series.history);
      const lastActual = series.history[series.history.length - 1].actual;
      const lastUpper = series.uppers[series.uppers.length - 1];
      return json(ok({
        metric,
        report: buildTrendReportV5(metric, series.history, series.uppers),
        anomaly: detectAnomalyV5(lastActual, f.nextForecast, lastUpper),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/trend-forecast/alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "trend-forecast:write");
      if (denied) return denied;

      const body = await c.req.json() as { level: "info" | "warning" | "critical"; message: string; metric: string };
      return json(ok({
        id: `alert-${Date.now()}`,
        ...body,
        firedAt: Date.now(),
      }));
    },
  },
];
