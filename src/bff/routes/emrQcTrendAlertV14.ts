/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预警 V14 路由（M475-A）
 *
 * GET /api/v1/emr-qc-trend-alert  （read，auth:true，query 用 new URL 取 indicator）返回预警列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTrendAlert, type TrendAlertV14 } from "../aggregators/emrQcTrendAlertV14Aggregator.js";

const demoAlerts: TrendAlertV14[] = [
  buildTrendAlert("通过率", 95, 90),
  buildTrendAlert("缺陷率", 8, 10),
  buildTrendAlert("归档率", 98, 98),
];

export const emrQcTrendAlertV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-trend-alert",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-trend-alert:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const indicator = url.searchParams.get("indicator") ?? "";
      const alerts = indicator
        ? demoAlerts.filter((a) => a.indicator === indicator)
        : demoAlerts;
      return json(ok({ alerts, total: alerts.length }));
    },
  },
];
