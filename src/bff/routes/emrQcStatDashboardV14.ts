/**
 * 健澜科技 jlmedaios - 质控综合统计大屏 V14 路由（M500-D，M500 收官里程碑）
 *
 * GET /api/v1/emr-qc-stat-dashboard  （read，auth:true）返回大屏数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateAllStats, buildStatDashboard } from "../aggregators/emrQcStatDashboardV14Aggregator.js";

const sampleDashboard = aggregateAllStats(28, 273, 300, 28.0);

export const emrQcStatDashboardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-stat-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-stat-dashboard:read");
      if (denied) return denied;
      return json(ok({ dashboard: sampleDashboard }));
    },
  },
];
