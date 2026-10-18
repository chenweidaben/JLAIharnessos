/**
 * 健澜科技 jlmedaios - 质控指标看板 V14 路由（M484-A）
 *
 * GET /api/v1/emr-qc-metric-dashboard  （read，auth:true）返回看板汇总
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDashboard, aggregateDashboardMetrics, type DashboardV14 } from "../aggregators/emrQcMetricDashboardV14Aggregator.js";

const demoMetrics = [
  { name: "完整率", value: 95 },
  { name: "及时率", value: 85 },
  { name: "规范率", value: 90 },
];

const demoDashboard: DashboardV14 = buildDashboard("质控指标看板", demoMetrics);
const demoAggregate = aggregateDashboardMetrics(demoMetrics);

export const emrQcMetricDashboardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-metric-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-metric-dashboard:read");
      if (denied) return denied;
      return json(ok({ dashboard: demoDashboard, aggregate: demoAggregate }));
    },
  },
];
