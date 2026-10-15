/**
 * 健澜科技 jlmedaios - 系统监控指标聚合器（M145-C 生产化收尾）
 *
 * 监控要有告警，不能只看图表：统一收敛七类系统指标——
 *  API 响应时间 P50 / P95 / P99、错误率、内存使用率、CPU 使用率、
 *  数据库连接数、在线用户数。
 *
 * 分层：
 *  - 纯函数：recordSystemMetric / getMetricTrend / evaluateAlerts /
 *    buildDashboardView。不写模块级状态、不修改入参（tags 深拷贝、
 *    过滤不在副本上落地），可直接单测。
 *  - 进程内采集：recordMetric / storeMetric 写入有界环形缓冲
 *    （默认 10000 条，零新依赖），并对超阈值样本即时打 alerting 标签；
 *    startSystemMetricSampler 由 server.ts 一行接入，周期采样进程
 *    内存 / CPU 并从性能环形缓冲派生 API 延迟与错误率。
 *
 * 生产安全加固：
 *  - 环形缓冲有界（MAX_SAMPLES），指标风暴下不会内存无限增长；
 *  - 纯函数对空样本、未知类型、非数值、hours<=0 全部防御，返回 0 / 空集；
 *  - tags 仅承载运维维度（route / scope），严禁落患者 PII；
 *  - 采样不落库、不外发；持久化表 medmuse.system_metrics 由
 *    deploy/postgres/init/292-system-metrics.sql 定义，供后续归档；
 *  - 采样器 tick 全量 try/catch，任何采样异常都不影响 BFF 主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  computePercentiles,
  listPerformanceRecords,
} from './performanceMonitorAggregator';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 系统指标类型（七类监控指标全量覆盖） */
export type SystemMetricType =
  | 'api_latency_p50'
  | 'api_latency_p95'
  | 'api_latency_p99'
  | 'error_rate'
  | 'memory_usage'
  | 'cpu_usage'
  | 'db_connections'
  | 'online_users';

/** 单条指标采样 */
export interface Metric {
  /** 指标类型 */
  type: SystemMetricType;
  /** 数值（延迟 ms；使用率 %；错误率 0..1；连接数 / 在线人数为整数） */
  value: number;
  /** 维度标签（运维维度，不含患者 PII） */
  tags: Record<string, string>;
  /** 采样时间（epoch ms） */
  recordedAt: number;
}

/** 趋势单点（按整点小时分桶） */
export interface TrendPoint {
  /** 桶起点（epoch ms，整点小时） */
  bucketStart: number;
  /** 桶内均值（保留 2 位小数） */
  avg: number;
  /** 桶内最大值 */
  max: number;
  /** 桶内样本数 */
  count: number;
}

/** 指标趋势窗口 */
export interface Trend {
  metricType: SystemMetricType;
  /** 窗口小时数 */
  hours: number;
  /** 时间升序的分桶点（仅含有样本的桶） */
  points: TrendPoint[];
  /** 窗口内最新值（无样本为 null） */
  latest: number | null;
}

/** 告警规则（超阈值自动告警） */
export interface AlertRule {
  type: SystemMetricType;
  /** 触发阈值（> 才告警） */
  threshold: number;
  /** 展示单位 */
  unit: string;
  /** 告警文案 */
  message: string;
}

/** 触发中的告警 */
export interface MetricAlert {
  type: SystemMetricType;
  /** 实测值 */
  value: number;
  /** 阈值 */
  threshold: number;
  /** warning（刚越线）/ critical（越线达阈值 2 倍） */
  level: 'warning' | 'critical';
  /** 告警文案 */
  message: string;
  /** 触发时间（epoch ms，取样本采样时间） */
  triggeredAt: number;
}

/** 仪表盘最新值行 */
export interface LatestMetricRow {
  type: SystemMetricType;
  label: string;
  unit: string;
  value: number | null;
  tags: Record<string, string>;
  recordedAt: number | null;
}

/** GET /api/v1/admin/metrics 返回的完整仪表盘视图 */
export interface SystemMetricsDashboard {
  windowHours: number;
  latest: LatestMetricRow[];
  trends: Trend[];
  alerts: MetricAlert[];
  rules: AlertRule[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 全部指标类型（仪表盘逐一生成趋势） */
export const SYSTEM_METRIC_TYPES: SystemMetricType[] = [
  'api_latency_p50',
  'api_latency_p95',
  'api_latency_p99',
  'error_rate',
  'memory_usage',
  'cpu_usage',
  'db_connections',
  'online_users',
];

/** 指标展示元数据 */
export const METRIC_META: Record<SystemMetricType, { label: string; unit: string }> = {
  api_latency_p50: { label: 'API 响应时间 P50', unit: 'ms' },
  api_latency_p95: { label: 'API 响应时间 P95', unit: 'ms' },
  api_latency_p99: { label: 'API 响应时间 P99', unit: 'ms' },
  error_rate: { label: 'API 错误率', unit: '%' },
  memory_usage: { label: '内存使用率', unit: '%' },
  cpu_usage: { label: 'CPU 使用率', unit: '%' },
  db_connections: { label: '数据库连接数', unit: '个' },
  online_users: { label: '在线用户数', unit: '人' },
};

/**
 * 超阈值自动告警规则（生产化收尾）：
 *  - P95 > 1s（1000ms）
 *  - 错误率 > 1%（0.01）
 *  - 内存使用率 > 90%
 */
export const ALERT_RULES: AlertRule[] = [
  {
    type: 'api_latency_p95',
    threshold: 1000,
    unit: 'ms',
    message: 'API P95 响应时间超过 1s，存在慢接口风险，请检查慢接口 Top10',
  },
  {
    type: 'error_rate',
    threshold: 0.01,
    unit: '%',
    message: 'API 错误率超过 1%，请立即排查最近 5xx / 4xx 请求',
  },
  {
    type: 'memory_usage',
    threshold: 90,
    unit: '%',
    message: '内存使用率超过 90%，存在 OOM 风险，请检查内存泄漏与大对象',
  },
];

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：把一次指标采样归一为 Metric。
 *  - type 未知时原样保留（防御不抛错），趋势 / 告警仅识别已知类型；
 *  - value 非数值防御为 0，负值（异常采样）防御为 0；
 *  - tags 浅拷贝并强制字符串化，调用方后续修改入参不影响本结果；
 *  - recordedAt 默认 0（由进程层 recordMetric 统一打 Date.now()）。
 */
export function recordSystemMetric(
  type: string,
  value: number,
  tags: Record<string, string> = {},
  recordedAt = 0,
): Metric {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const safeTags: Record<string, string> = {};
  for (const [k, v] of Object.entries(tags ?? {})) {
    safeTags[k] = typeof v === 'string' ? v : String(v);
  }
  return {
    type: type as SystemMetricType,
    value: safeValue,
    tags: safeTags,
    recordedAt: Math.max(0, Math.floor(recordedAt)),
  };
}

/**
 * 纯函数：按整点小时分桶，计算最近 hours 小时的指标趋势。
 *  - hours <= 0 或空样本 → 空趋势（latest 为 null）；
 *  - 过滤不修改入参数组；桶按时间升序返回；
 *  - latest 取窗口内 recordedAt 最新一条的实测值。
 */
export function getMetricTrend(
  records: Metric[],
  metricType: string,
  hours: number,
  now = Date.now(),
): Trend {
  const empty: Trend = {
    metricType: metricType as SystemMetricType,
    hours,
    points: [],
    latest: null,
  };
  const list = Array.isArray(records) ? records : [];
  if (list.length === 0 || !(hours > 0)) return empty;

  const windowMs = hours * 3_600_000;
  const cutoff = now - windowMs;

  const byBucket = new Map<number, number[]>();
  let latestValue: number | null = null;
  let latestAt = -1;

  for (const r of list) {
    if (r.type !== metricType) continue;
    if (!(r.recordedAt >= cutoff && r.recordedAt <= now)) continue;
    const bucketStart = Math.floor(r.recordedAt / 3_600_000) * 3_600_000;
    const bucket = byBucket.get(bucketStart) ?? [];
    bucket.push(r.value);
    byBucket.set(bucketStart, bucket);
    if (r.recordedAt > latestAt) {
      latestAt = r.recordedAt;
      latestValue = r.value;
    }
  }

  const points: TrendPoint[] = Array.from(byBucket.entries())
    .map(([bucketStart, values]) => {
      const sum = values.reduce((a, b) => a + b, 0);
      return {
        bucketStart,
        avg: Math.round((sum / values.length) * 100) / 100,
        max: Math.max(...values),
        count: values.length,
      };
    })
    .sort((a, b) => a.bucketStart - b.bucketStart);

  return { metricType: metricType as SystemMetricType, hours, points, latest: latestValue };
}

/**
 * 纯函数：按告警规则评估窗口内最新值，超阈值（>）即产出告警。
 *  - 越线达阈值 2 倍及以上 → critical，否则 warning；
 *  - 窗口内无该类型样本 → 不告警（避免冷启动误报）；
 *  - 不修改入参。
 */
export function evaluateAlerts(records: Metric[]): MetricAlert[] {
  const list = Array.isArray(records) ? records : [];
  if (list.length === 0) return [];

  /** 取每类指标最新一条样本 */
  const latestByType = new Map<SystemMetricType, Metric>();
  for (const r of list) {
    const prev = latestByType.get(r.type);
    if (!prev || r.recordedAt > prev.recordedAt) {
      latestByType.set(r.type, r);
    }
  }

  const alerts: MetricAlert[] = [];
  for (const rule of ALERT_RULES) {
    const sample = latestByType.get(rule.type);
    if (!sample) continue;
    if (sample.value <= rule.threshold) continue;
    alerts.push({
      type: rule.type,
      value: sample.value,
      threshold: rule.threshold,
      level: sample.value >= rule.threshold * 2 ? 'critical' : 'warning',
      message: rule.message,
      triggeredAt: sample.recordedAt,
    });
  }
  return alerts;
}

/**
 * 纯函数：聚合窗口内全部样本为仪表盘视图（供路由直接返回）。
 * 逐类型生成趋势 + 最新值行，并对全部规则做超阈值评估。
 * now 为可注入的窗口参照时间（默认当前时间，便于单测固定时间）。
 */
export function buildDashboardView(records: Metric[], hours = 1, now = Date.now()): SystemMetricsDashboard {
  const list = Array.isArray(records) ? records : [];
  const trends = SYSTEM_METRIC_TYPES.map((t) => getMetricTrend(list, t, hours, now));

  const latest = SYSTEM_METRIC_TYPES.map((type) => {
    const meta = METRIC_META[type];
    const trend = trends.find((t) => t.metricType === type);
    const sample = list
      .filter((r) => r.type === type)
      .sort((a, b) => b.recordedAt - a.recordedAt)[0];
    return {
      type,
      label: meta.label,
      unit: meta.unit,
      value: trend ? trend.latest : null,
      tags: sample ? { ...sample.tags } : {},
      recordedAt: sample ? sample.recordedAt : null,
    };
  });

  return {
    windowHours: hours,
    latest,
    trends,
    alerts: evaluateAlerts(list),
    rules: ALERT_RULES.map((r) => ({ ...r })),
  };
}

/* ------------------------------------------------------------------ */
/* 进程内采集（零新依赖，模块级环形缓冲）                                 */
/* ------------------------------------------------------------------ */

/** 生产安全加固：环形缓冲上限，超出后丢弃最旧样本 */
const MAX_SAMPLES = 10_000;
const buffer: Metric[] = [];

/** 写入一条采样；超限时丢弃最旧样本，保证内存有界 */
export function storeMetric(metric: Metric): void {
  buffer.push(metric);
  if (buffer.length > MAX_SAMPLES) {
    buffer.splice(0, buffer.length - MAX_SAMPLES);
  }
}

/** 进程层写入：纯函数归一 + 打当前时间戳 + 入环形缓冲 */
export function recordMetric(
  type: string,
  value: number,
  tags: Record<string, string> = {},
): void {
  storeMetric(recordSystemMetric(type, value, tags, Date.now()));
}

/** 读取当前采样快照（返回副本，外部无法篡改内部缓冲） */
export function listMetrics(): Metric[] {
  return buffer.map((r) => ({ ...r, tags: { ...r.tags } }));
}

/** 读取最近 windowMs 毫秒内的快照副本 */
export function listRecentMetrics(windowMs: number): Metric[] {
  const now = Date.now();
  return listMetrics().filter((r) => r.recordedAt >= now - Math.max(0, windowMs));
}

/* ------------------------------------------------------------------ */
/* 周期采样器（server.ts 一行接入，不碰 WebSocket）                      */
/* ------------------------------------------------------------------ */

let samplerStarted = false;

/**
 * 启动系统指标周期采样（默认 30s 一次，幂等）：
 *  - 从性能环形缓冲派生 API P50/P95/P99 与错误率（近 60s 至少 5 个采样才落）；
 *  - 采样进程内存（heapUsed/heapTotal）与 CPU（两次 tick 的 cpuUsage 差）；
 *  - db_connections / online_users 由外部采集侧通过 recordMetric 写入，
 *    本采样器不代填（冷启动无样本时仪表盘显示 null，不伪造数据）。
 * 任何 tick 异常都被吞掉，绝不影响 BFF 主流程。
 */
export function startSystemMetricSampler(intervalMs = 30_000): void {
  if (samplerStarted) return;
  samplerStarted = true;

  let prevCpu = process.cpuUsage();
  let prevAt = Date.now();

  const tick = (): void => {
    try {
      /* ---- 派生 API 延迟与错误率（复用 M123-D 性能采样缓冲） ---- */
      const perf = listPerformanceRecords();
      const recent = perf.filter((r) => r.recordedAt >= Date.now() - 60_000);
      if (recent.length >= 5) {
        const durations = recent.map((r) => r.durationMs);
        const pct = computePercentiles(durations);
        recordMetric('api_latency_p50', pct.p50);
        recordMetric('api_latency_p95', pct.p95);
        recordMetric('api_latency_p99', pct.p99);
        const errors = recent.filter((r) => r.isError).length;
        recordMetric(
          'error_rate',
          Math.round((errors / recent.length) * 10_000) / 10_000,
          { scope: 'bff' },
        );
      }

      /* ---- 进程内存：heapUsed / heapTotal ---- */
      const mem = process.memoryUsage();
      const memPct =
        mem.heapTotal > 0
          ? Math.round((mem.heapUsed / mem.heapTotal) * 1_000) / 10
          : 0;
      recordMetric('memory_usage', memPct, { scope: 'bff' });

      /* ---- 进程 CPU：两次 tick 的 cpuUsage 差 / 经过时间 ---- */
      const cpu = process.cpuUsage(prevCpu);
      const now = Date.now();
      const elapsedUs = Math.max(1, (now - prevAt) * 1_000);
      const cpuPct = Math.round(((cpu.user + cpu.system) / elapsedUs) * 1_000) / 10;
      prevCpu = process.cpuUsage();
      prevAt = now;
      recordMetric('cpu_usage', cpuPct, { scope: 'bff' });
    } catch {
      /* 采样器故障不影响业务 */
    }
  };

  tick();
  setInterval(tick, Math.max(5_000, intervalMs));
}
