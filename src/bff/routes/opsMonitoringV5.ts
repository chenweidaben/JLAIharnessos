/**
 * 健澜科技 jlmedaios - 全链路监控与告警 V5 路由（M286-A）
 *
 * GET  /api/v1/ops-monitoring（监控看板）
 * POST /api/v1/ops-monitoring/rules（新建告警规则）
 * GET  /api/v1/ops-monitoring/events（告警事件）
 *
 * 权限：ops-monitoring:read / ops-monitoring:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateMetricsV5,
  buildOpsMonitoringV5Report,
  dedupAlertsV5,
  evaluateAlertV5,
  type AlertEvent,
  type AlertRule,
  type MetricPoint,
} from "../aggregators/opsMonitoringV5Aggregator.js";

const ruleStore: AlertRule[] = [
  { id: "r1", name: "P95延迟超阈值", metric: "http_p95_latency_ms", condition: "gt", threshold: 800, severity: "critical" },
  { id: "r2", name: "错误率告警", metric: "error_rate", condition: "gt", threshold: 1, severity: "warning" },
];

const eventStore: AlertEvent[] = [
  { ruleId: "r1", value: 1200, firedAt: 1000 },
  { ruleId: "r1", value: 900, firedAt: 2000 },
  { ruleId: "r2", value: 2, firedAt: 3000, recoveredAt: 4000 },
];

const pointStore: MetricPoint[] = [
  { name: "http_p95_latency_ms", value: 600, ts: 1000 },
  { name: "http_p95_latency_ms", value: 700, ts: 2000 },
];

export const opsMonitoringV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-monitoring",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-monitoring:read");
      if (denied) return denied;

      return json(ok(buildOpsMonitoringV5Report(eventStore, ruleStore, pointStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-monitoring/rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-monitoring:write");
      if (denied) return denied;

      const body = await c.req.json() as Omit<AlertRule, "id">;
      const rule: AlertRule = { ...body, id: `r-${ruleStore.length + 1}` };
      ruleStore.push(rule);
      return json(ok(rule));
    },
  },
  {
    method: "GET",
    path: "/api/v1/ops-monitoring/events",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-monitoring:read");
      if (denied) return denied;

      return json(ok({
        aggregated: aggregateMetricsV5(pointStore),
        deduped: dedupAlertsV5(eventStore),
        triggeredNow: evaluateAlertV5(1200, ruleStore[0]),
      }));
    },
  },
];
