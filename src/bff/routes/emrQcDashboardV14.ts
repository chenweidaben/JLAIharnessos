/**
 * 健澜科技 jlmedaios - 病历质控指标体系大屏 V14 路由（M468-A）
 *
 * GET /api/v1/emr-qc-dashboard  （read，auth:true）返回质控指标总览
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcDashboard,
  computeIndicatorTrend,
} from "../aggregators/emrQcDashboardV14Aggregator.js";

const demoData = { totalRecords: 1000, passCount: 950, defectCount: 50 };

export const emrQcDashboardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dashboard:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const dashboard = buildQcDashboard(demoData);
      const trend = computeIndicatorTrend(dashboard.passRate, 90);
      return json(ok({ dashboard, trend }));
    },
  },
];
