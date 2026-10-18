/**
 * 健澜科技 jlmedaios - 病历AI质控趋势预测 V14 路由（M549-D，M549 收官）
 *
 * GET  /api/v1/emr-ai-qc-trend-forecast  （read，auth:true）返回 AI 趋势预测基础数据
 * POST /api/v1/emr-ai-qc-trend-forecast  （auth:true）AI 趋势预测 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAiQcTrendForecast,
  buildAiQcTrendForecastReport,
  forecastQcTrendByAi,
  type AiQcTrendForecastInputV14,
} from "../aggregators/emrAiQcTrendForecastV14Aggregator.js";

export const emrAiQcTrendForecastV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-ai-qc-trend-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-trend-forecast:read");
      if (denied) return denied;
      const base = buildAiQcTrendForecast("RECB020", "医务处");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-ai-qc-trend-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-ai-qc-trend-forecast:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: AiQcTrendForecastInputV14 = {
        currentPassRate: Number(obj?.currentPassRate ?? 0),
        monthlyImprove: Number(obj?.monthlyImprove ?? 0),
      };
      const result = forecastQcTrendByAi(input);
      const report = buildAiQcTrendForecastReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
