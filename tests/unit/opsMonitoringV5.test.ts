/**
 * 健澜科技 jlmedaios - 全链路监控与告警 V5 单测（M286-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateMetricsV5,
  buildOpsMonitoringV5Report,
  dedupAlertsV5,
  evaluateAlertV5,
  type AlertEvent,
  type AlertRule,
  type MetricPoint,
} from "../../src/bff/aggregators/opsMonitoringV5Aggregator";
import { opsMonitoringV5Routes } from "../../src/bff/routes/opsMonitoringV5";

const rule: AlertRule = {
  id: "r1",
  name: "P95",
  metric: "http_p95_latency_ms",
  condition: "gt",
  threshold: 800,
  severity: "critical",
};

describe("evaluateAlertV5", () => {
  it("值1200>阈值800→触发", () => {
    expect(evaluateAlertV5(1200, rule)).toBe(true);
  });
  it("值500<阈值800→不触发", () => {
    expect(evaluateAlertV5(500, rule)).toBe(false);
  });
});

describe("aggregateMetricsV5", () => {
  it("两个p95点600/700→平均650", () => {
    const points: MetricPoint[] = [
      { name: "p95", value: 600, ts: 1 },
      { name: "p95", value: 700, ts: 2 },
    ];
    expect(aggregateMetricsV5(points)["p95"]).toBe(650);
  });
});

describe("dedupAlertsV5", () => {
  it("同ruleId两条未恢复→保留最早1条", () => {
    const events: AlertEvent[] = [
      { ruleId: "r1", value: 1, firedAt: 2000 },
      { ruleId: "r1", value: 1, firedAt: 1000 },
      { ruleId: "r2", value: 1, firedAt: 1000, recoveredAt: 2000 },
    ];
    expect(dedupAlertsV5(events).length).toBe(1);
  });
});

describe("buildOpsMonitoringV5Report", () => {
  it("活跃告警1条critical+平均P95=650", () => {
    const events: AlertEvent[] = [{ ruleId: "r1", value: 1, firedAt: 1000 }];
    const points: MetricPoint[] = [
      { name: "http_p95_latency_ms", value: 600, ts: 1 },
      { name: "http_p95_latency_ms", value: 700, ts: 2 },
    ];
    const r = buildOpsMonitoringV5Report(events, [rule], points);
    expect(r.activeAlerts).toBe(1);
    expect(r.criticalCount).toBe(1);
    expect(r.avgP95LatencyMs).toBe(650);
  });
});

describe("opsMonitoringV5Routes 写权限", () => {
  it("POST /api/v1/ops-monitoring/rules 路由存在且 auth:true", () => {
    const post = opsMonitoringV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/ops-monitoring/rules");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
