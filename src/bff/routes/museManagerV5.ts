/**
 * 健澜科技 jlmedaios - 管理者 MUSE 工作台 V5 路由（M283-D）
 *
 * GET  /api/v1/muse-manager（工作台）
 * GET  /api/v1/muse-manager/anomalies（KPI异常）
 * POST /api/v1/muse-manager/decision（决策记录）
 *
 * 权限：muse-manager:read / muse-manager:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildManagerDailyV5,
  detectAnomalyKpiV5,
  suggestDecisionV5,
  type KpiMetric,
} from "../aggregators/museManagerV5Aggregator.js";

const kpiStore: KpiMetric[] = [
  { name: "床位周转率", value: 18, target: 25, baseline: 24 },
  { name: "患者满意度", value: 90, target: 90, baseline: 88 },
  { name: "平均住院日", value: 9, target: 8, baseline: 7.5 },
];

export const museManagerV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-manager",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-manager:read");
      if (denied) return denied;

      const managerId = c.query.get("managerId") ?? "mgr-001";
      return json(ok(buildManagerDailyV5(managerId, kpiStore)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-manager/anomalies",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-manager:read");
      if (denied) return denied;

      const anomalies = kpiStore
        .map((k) => ({ kpi: k, detection: detectAnomalyKpiV5(k), suggestion: suggestDecisionV5(k) }))
        .filter((x) => x.detection.anomaly);
      return json(ok({ anomalies }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-manager/decision",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-manager:write");
      if (denied) return denied;

      const body = await c.req.json() as { kpiName: string; decision: string; owner: string };
      return json(ok({ recorded: true, ...body }));
    },
  },
];
