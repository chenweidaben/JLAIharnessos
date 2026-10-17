/**
 * 健澜科技 jlmedaios - 全链路监控与告警 V5 纯函数（M286-A）
 *
 * evaluateAlertV5 / aggregateMetricsV5 / dedupAlertsV5 / buildOpsMonitoringV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指标点 */
export interface MetricPoint {
  name: string;
  value: number;
  ts: number;
}

/** 告警规则 */
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq";
  threshold: number;
  severity: "info" | "warning" | "critical";
}

/** 告警事件 */
export interface AlertEvent {
  ruleId: string;
  value: number;
  firedAt: number;
  recoveredAt?: number;
}

/**
 * 告警评估 V5（纯函数）：按条件判定。
 *
 * @param metric 当前指标值
 * @param rule 规则
 * @returns 是否触发
 */
export function evaluateAlertV5(metric: number, rule: AlertRule): boolean {
  if (rule.condition === "gt") return metric > rule.threshold;
  if (rule.condition === "lt") return metric < rule.threshold;
  return metric === rule.threshold;
}

/**
 * 指标聚合 V5（纯函数）：按 name 取平均。
 *
 * @param points 指标点列表
 * @returns 平均值
 */
export function aggregateMetricsV5(points: MetricPoint[]): Record<string, number> {
  const sum: Record<string, { total: number; count: number }> = {};
  for (const p of points) {
    if (!sum[p.name]) sum[p.name] = { total: 0, count: 0 };
    sum[p.name].total += p.value;
    sum[p.name].count += 1;
  }
  const avg: Record<string, number> = {};
  for (const [name, v] of Object.entries(sum)) {
    avg[name] = Math.round((v.total / v.count) * 100) / 100;
  }
  return avg;
}

/**
 * 告警去重 V5（纯函数）：同 ruleId 同窗口内未恢复事件只保留最早一条。
 *
 * @param events 事件列表
 * @returns 去重后事件
 */
export function dedupAlertsV5(events: AlertEvent[]): AlertEvent[] {
  const seen = new Map<string, AlertEvent>();
  for (const e of events) {
    if (e.recoveredAt !== undefined) continue;
    const existing = seen.get(e.ruleId);
    if (!existing || e.firedAt < existing.firedAt) {
      seen.set(e.ruleId, e);
    }
  }
  return Array.from(seen.values());
}

/** 监控看板输出 */
export interface OpsMonitoringV5Report {
  activeAlerts: number;
  criticalCount: number;
  avgP95LatencyMs: number;
}

/**
 * 构建监控看板（纯函数）。
 *
 * @param events 事件列表
 * @param rules 规则列表
 * @param points 指标点列表
 * @returns 看板
 */
export function buildOpsMonitoringV5Report(events: AlertEvent[], rules: AlertRule[], points: MetricPoint[]): OpsMonitoringV5Report {
  const active = dedupAlertsV5(events);
  const criticalCount = active.filter((e) => {
    const rule = rules.find((r) => r.id === e.ruleId);
    return rule?.severity === "critical";
  }).length;
  const p95Points = points.filter((p) => p.name === "http_p95_latency_ms");
  const avgP95LatencyMs = p95Points.length > 0
    ? Math.round((p95Points.reduce((s, p) => s + p.value, 0) / p95Points.length) * 10) / 10
    : 0;
  return {
    activeAlerts: active.length,
    criticalCount,
    avgP95LatencyMs,
  };
}
