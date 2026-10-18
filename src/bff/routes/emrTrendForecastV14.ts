/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预测 V14 路由（M470-A）
 *
 * GET /api/v1/emr-trend-forecast  （read，auth:true，query 用 new URL 取 indicator/months）返回历史+预测
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildForecastChart,
  linearForecast,
} from "../aggregators/emrTrendForecastV14Aggregator.js";

const demoHistory = [90, 92, 94];

export const emrTrendForecastV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-trend-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-trend-forecast:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const indicator = url.searchParams.get("indicator") ?? "passRate";
      const months = Number(url.searchParams.get("months") ?? "3");
      const forecast = linearForecast(demoHistory, months);
      const chart = buildForecastChart(demoHistory, forecast);
      return json(ok({ indicator, chart }));
    },
  },
];
