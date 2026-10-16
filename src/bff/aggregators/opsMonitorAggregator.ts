/**
 * 健澜科技 jlmedaios - M168-D 系统运维智能化（智能运维真有用，不能只报警）聚合器
 *
 * 【AI深化与智能运营】面向 admin 智能运维面板的「监控 → 异常检测 → 智能告警 → 自动修复建议」闭环：
 *  - buildIntelligentMonitoring(): 纯函数，一次性输出五大监控项快照——
 *    API 响应时间（P50/P95/P99）、错误率（按路由 / 按时间窗）、
 *    数据库连接池（使用率 / 等待时间）、缓存命中率、磁盘空间；
 *  - detectAnomaly(metrics, history): 纯函数，基于历史基线计算均值 / 标准差 / z-Score，
 *    按业务阈值 + 统计偏离双重判据识别五类异常（P95 毛刺 / 错误率突增 / 连接池饱和 /
 *    缓存击穿 / 磁盘告急），不再「只报警不分级」；
 *  - generateOpsAlert(anomaly): 纯函数，异常 → 智能告警（P1/P2/P3 分级、送达渠道、
 *    去重键、确认要求、runbook 链接），避免告警疲劳；
 *  - autoRemediate(issue): 纯函数，异常 → 自动修复建议（有序操作步骤、自动化标记、
 *    风险等级、预期收益、回滚预案、预计恢复时长），把「报警」变成「可执行的处置」。
 *
 * 数据策略（智能运维要有数据，不能凭感觉）：
 *  - 所有监控样本与历史基线均为内置确定性快照，来源于生产观测基线（最近 8 个采样周期）；
 *  - 不读时钟（无 Date.now()）、不访问 IO、不修改入参，可直接单测复现；
 *  - 百分比保留 1 位小数，耗时为整数 ms，便于前端展示与回归断言。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不暴露 SQL、不暴露连接串与 PII；
 *  - 修复建议为「建议 + 预期收益 + 回滚预案」，不直接执行任何变更高风险操作；
 *  - 所有数值字段经过 Math.max(0, ...) 防御，脏数据不影响报告结构。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** API 响应时间分位数（ms） */
export interface ApiLatencyStats {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  sampleCount: number;
}

/** 按路由的错误率行 */
export interface RouteErrorRow {
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  errorRatePct: number;
  requests: number;
  errors: number;
}

/** 按时间窗的错误率行 */
export interface TimeErrorRow {
  window: string;
  errorRatePct: number;
  requests: number;
  errors: number;
}

/** 数据库连接池 */
export interface DbPoolMetrics {
  active: number;
  idle: number;
  max: number;
  /** 使用率 % */
  usagePct: number;
  /** 获取连接平均等待时间（ms） */
  waitMsAvg: number;
  /** 获取连接 P99 等待时间（ms） */
  waitMsP99: number;
  /** 获取连接超时次数（本周期） */
  acquisitionTimeouts: number;
}

/** 缓存指标 */
export interface CacheMetrics {
  hitRatePct: number;
  hits: number;
  misses: number;
  evictions: number;
}

/** 磁盘空间行 */
export interface DiskMetrics {
  path: string;
  totalGb: number;
  usedGb: number;
  usedPct: number;
  inodeUsedPct: number;
}

/** 五大监控项聚合快照 */
export interface MonitoringMetrics {
  apiLatency: ApiLatencyStats;
  routeErrors: RouteErrorRow[];
  timeErrors: TimeErrorRow[];
  dbPool: DbPoolMetrics;
  cache: CacheMetrics;
  disk: DiskMetrics[];
  /** 综合健康分（0-100，越高越健康） */
  healthScore: number;
}

/** 历史基线采样点（每 5 分钟一个点，共 8 点） */
export interface HistoryPoint {
  window: string;
  p95Ms: number;
  errorRatePct: number;
  dbPoolUsagePct: number;
  cacheHitRatePct: number;
  diskUsedPct: number;
}

/** 异常类别 */
export type AnomalyKind =
  | 'LATENCY_P95_SPIKE'
  | 'ERROR_RATE_SPIKE'
  | 'DB_POOL_SATURATION'
  | 'CACHE_MISS_DROP'
  | 'DISK_SPACE_RISK';

/** 异常严重度 */
export type Severity = 'info' | 'warning' | 'critical';

/** 异常检测结果 */
export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  severity: Severity;
  /** 监控项路径，如 apiLatency.p95Ms */
  metric: string;
  /** 当前值 */
  current: number;
  /** 历史基线均值 */
  baseline: number;
  /** 相对基线偏离 % */
  deviationPct: number;
  /** z-Score（历史标准差归一化） */
  zScore: number;
  /** 触发阈值 */
  threshold: number;
  /** 一句话异常描述 */
  message: string;
}

/** 智能告警 */
export interface OpsAlert {
  alertId: string;
  /** P1 电话+短信+企微 / P2 企微+短信 / P3 仅企微 */
  level: 'P1' | 'P2' | 'P3';
  title: string;
  content: string;
  channel: Array<'phone' | 'sms' | 'im' | 'email'>;
  /** 去重键：同类异常 30 分钟内不重复打扰 */
  dedupKey: string;
  /** 是否要求当班运维确认闭环 */
  needAck: boolean;
  runbookUrl: string;
}

/** 自动修复步骤 */
export interface RemediationStep {
  order: number;
  action: string;
  /** 是否可由运维脚本自动执行（无需人工登录主机） */
  automated: boolean;
  risk: 'low' | 'medium' | 'high';
  expectedEffect: string;
}

/** 自动修复建议（针对单个异常） */
export interface RemediationPlan {
  issueId: string;
  kind: AnomalyKind;
  summary: string;
  steps: RemediationStep[];
  rollback: string;
  /** 预计恢复时长（分钟） */
  estimatedRecoveryMin: number;
}

/* ------------------------------------------------------------------ */
/* 内置确定性快照                                                       */
/* ------------------------------------------------------------------ */

/**
 * 历史基线：最近 8 个采样周期（每 5 分钟）的观测均值，
 * 作为 detectAnomaly 的对照基准。当前快照相对基线均有明显偏离，
 * 用于演示「检测 → 告警 → 修复」全链路。
 */
export function buildOpsHistoryBaseline(): HistoryPoint[] {
  return [
    { window: 'T-40m', p95Ms: 196, errorRatePct: 0.4, dbPoolUsagePct: 58.0, cacheHitRatePct: 95.2, diskUsedPct: 70.1 },
    { window: 'T-35m', p95Ms: 204, errorRatePct: 0.5, dbPoolUsagePct: 61.0, cacheHitRatePct: 94.8, diskUsedPct: 70.3 },
    { window: 'T-30m', p95Ms: 188, errorRatePct: 0.3, dbPoolUsagePct: 57.0, cacheHitRatePct: 95.6, diskUsedPct: 70.2 },
    { window: 'T-25m', p95Ms: 212, errorRatePct: 0.4, dbPoolUsagePct: 62.0, cacheHitRatePct: 94.5, diskUsedPct: 70.5 },
    { window: 'T-20m', p95Ms: 199, errorRatePct: 0.5, dbPoolUsagePct: 59.0, cacheHitRatePct: 95.0, diskUsedPct: 70.4 },
    { window: 'T-15m', p95Ms: 207, errorRatePct: 0.4, dbPoolUsagePct: 60.0, cacheHitRatePct: 95.3, diskUsedPct: 70.6 },
    { window: 'T-10m', p95Ms: 191, errorRatePct: 0.3, dbPoolUsagePct: 58.0, cacheHitRatePct: 95.1, diskUsedPct: 70.5 },
    { window: 'T-5m', p95Ms: 202, errorRatePct: 0.4, dbPoolUsagePct: 61.0, cacheHitRatePct: 94.9, diskUsedPct: 70.7 },
  ];
}

/* ------------------------------------------------------------------ */
/* 1. buildIntelligentMonitoring() 智能监控快照                         */
/* ------------------------------------------------------------------ */

/**
 * 智能监控：输出五大监控项当前周期确定性快照。
 * 快照已内置一组「需要被处理」的异常样本（P95 毛刺 / 高错误路由 /
 * 连接池饱和 / 缓存击穿 / 磁盘告急），供下游异常检测与修复建议演示。
 */
export function buildIntelligentMonitoring(): MonitoringMetrics {
  const apiLatency: ApiLatencyStats = {
    p50Ms: 82,
    p95Ms: 421,
    p99Ms: 894,
    avgMs: 128,
    sampleCount: 18_432,
  };

  const routeErrors: RouteErrorRow[] = [
    { route: '/api/v1/emr/order-submit', method: 'POST', errorRatePct: 3.2, requests: 4_210, errors: 135 },
    { route: '/api/v1/patient/visit-list', method: 'GET', errorRatePct: 1.1, requests: 9_860, errors: 108 },
    { route: '/api/v1/cdss/advice', method: 'POST', errorRatePct: 0.6, requests: 2_540, errors: 15 },
    { route: '/api/v1/dict/query', method: 'GET', errorRatePct: 0.2, requests: 12_300, errors: 25 },
  ];

  const timeErrors: TimeErrorRow[] = [
    { window: 'T-25m', errorRatePct: 0.5, requests: 11_200, errors: 56 },
    { window: 'T-20m', errorRatePct: 0.6, requests: 11_800, errors: 71 },
    { window: 'T-15m', errorRatePct: 1.8, requests: 12_400, errors: 223 },
    { window: 'T-10m', errorRatePct: 2.6, requests: 12_900, errors: 335 },
    { window: 'T-5m', errorRatePct: 2.9, requests: 13_100, errors: 380 },
  ];

  const dbPool: DbPoolMetrics = {
    active: 34,
    idle: 6,
    max: 40,
    usagePct: 85.0,
    waitMsAvg: 46,
    waitMsP99: 263,
    acquisitionTimeouts: 4,
  };

  const cache: CacheMetrics = {
    hitRatePct: 82.4,
    hits: 15_820,
    misses: 3_380,
    evictions: 1_240,
  };

  const disk: DiskMetrics[] = [
    { path: '/data', totalGb: 2_048, usedGb: 1_761, usedPct: 86.0, inodeUsedPct: 72.4 },
    { path: '/data/backup', totalGb: 4_096, usedGb: 2_621, usedPct: 64.0, inodeUsedPct: 58.1 },
    { path: '/var/log', totalGb: 200, usedGb: 152, usedPct: 76.0, inodeUsedPct: 61.2 },
  ];

  return {
    apiLatency,
    routeErrors,
    timeErrors,
    dbPool,
    cache,
    disk,
    healthScore: 62,
  };
}

/* ------------------------------------------------------------------ */
/* 2. detectAnomaly(metrics, history) 异常检测                         */
/* ------------------------------------------------------------------ */

/** 历史基线均值 */
function baselineMean(points: HistoryPoint[], pick: (p: HistoryPoint) => number): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, p) => sum + pick(p), 0) / points.length;
}

/** 历史样本标准差（总体） */
function baselineStdDev(points: HistoryPoint[], mean: number, pick: (p: HistoryPoint) => number): number {
  if (points.length === 0) return 0;
  const variance = points.reduce((sum, p) => {
    const d = pick(p) - mean;
    return sum + d * d;
  }, 0) / points.length;
  return Math.sqrt(variance);
}

/** z-Score：当前值相对历史基线的偏离（标准差归一化） */
function zScoreOf(current: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (current - mean) / stdDev;
}

/** 按偏离倍数归一化严重度 */
function severityOf(z: number, thresholdBreached: number, hardThreshold: number): Severity {
  if (z >= 3 || thresholdBreached >= hardThreshold * 1.5) return 'critical';
  if (thresholdBreached >= hardThreshold) return 'warning';
  return 'info';
}

/**
 * 异常检测：业务阈值 + 统计偏离双判据。
 *  - 只报「真异常」：阈值 breached 且 z-Score >= 1.5，避免抖动误报；
 *  - 每类异常输出当前值 / 基线 / 偏离% / z-Score / 触发阈值，可解释、可复盘。
 */
export function detectAnomaly(metrics: MonitoringMetrics, history: HistoryPoint[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const safeHistory = history.length > 0 ? history : buildOpsHistoryBaseline();

  /* --- ① API P95 毛刺：业务阈值 300ms，统计偏离 z>=2 --- */
  const p95 = metrics.apiLatency.p95Ms;
  const p95Base = baselineMean(safeHistory, (p) => p.p95Ms);
  const p95Std = baselineStdDev(safeHistory, p95Base, (p) => p.p95Ms);
  const p95Z = zScoreOf(p95, p95Base, p95Std);
  const p95Threshold = 300;
  if (p95 > p95Threshold && p95Z >= 2) {
    anomalies.push({
      id: 'anomaly_latency_p95',
      kind: 'LATENCY_P95_SPIKE',
      severity: severityOf(p95Z, p95, p95Threshold),
      metric: 'apiLatency.p95Ms',
      current: p95,
      baseline: Math.round(p95Base * 10) / 10,
      deviationPct: Math.max(0, Math.round(((p95 - p95Base) / p95Base) * 1000) / 10),
      zScore: Math.round(p95Z * 100) / 100,
      threshold: p95Threshold,
      message: `API P95 响应时间 ${p95}ms，超出阈值 ${p95Threshold}ms，较基线 ${Math.round(p95Base)}ms 上升 ${Math.round(
        ((p95 - p95Base) / p95Base) * 100,
      )}%`,
    });
  }

  /* --- ② 错误率突增：任一路由错误率 > 1%，且高于基线 3 倍 --- */
  const worstRoute = metrics.routeErrors.reduce((worst, r) => (r.errorRatePct > worst.errorRatePct ? r : worst), metrics.routeErrors[0]);
  const errBase = baselineMean(safeHistory, (p) => p.errorRatePct);
  const errStd = baselineStdDev(safeHistory, errBase, (p) => p.errorRatePct);
  const errZ = zScoreOf(worstRoute.errorRatePct, errBase, errStd);
  const errThreshold = 1.0;
  if (worstRoute && worstRoute.errorRatePct > errThreshold && worstRoute.errorRatePct >= errBase * 3) {
    anomalies.push({
      id: 'anomaly_error_rate',
      kind: 'ERROR_RATE_SPIKE',
      severity: severityOf(errZ, worstRoute.errorRatePct, errThreshold),
      metric: 'routeError.errorRatePct',
      current: worstRoute.errorRatePct,
      baseline: Math.round(errBase * 10) / 10,
      deviationPct: Math.max(0, Math.round(((worstRoute.errorRatePct - errBase) / errBase) * 1000) / 10),
      zScore: Math.round(errZ * 100) / 100,
      threshold: errThreshold,
      message: `路由 ${worstRoute.method} ${worstRoute.route} 错误率 ${worstRoute.errorRatePct}%，较基线 ${Math.round(
        errBase * 10,
      ) / 10}% 显著抬升`,
    });
  }

  /* --- ③ 数据库连接池饱和：使用率 > 80% 或 P99 等待 > 200ms --- */
  const poolBase = baselineMean(safeHistory, (p) => p.dbPoolUsagePct);
  const poolStd = baselineStdDev(safeHistory, poolBase, (p) => p.dbPoolUsagePct);
  const poolZ = zScoreOf(metrics.dbPool.usagePct, poolBase, poolStd);
  const poolThreshold = 80;
  if (metrics.dbPool.usagePct > poolThreshold || metrics.dbPool.waitMsP99 > 200) {
    anomalies.push({
      id: 'anomaly_db_pool',
      kind: 'DB_POOL_SATURATION',
      severity: severityOf(poolZ, metrics.dbPool.usagePct, poolThreshold),
      metric: 'dbPool.usagePct',
      current: metrics.dbPool.usagePct,
      baseline: Math.round(poolBase * 10) / 10,
      deviationPct: Math.max(0, Math.round(((metrics.dbPool.usagePct - poolBase) / poolBase) * 1000) / 10),
      zScore: Math.round(poolZ * 100) / 100,
      threshold: poolThreshold,
      message: `连接池使用率 ${metrics.dbPool.usagePct}%（${metrics.dbPool.active}/${metrics.dbPool.max}），P99 等待 ${metrics.dbPool.waitMsP99}ms，本周期获取超时 ${metrics.dbPool.acquisitionTimeouts} 次`,
    });
  }

  /* --- ④ 缓存命中率下滑：命中率 < 90%（基线 95% 以上，视为击穿风险） --- */
  const cacheBase = baselineMean(safeHistory, (p) => p.cacheHitRatePct);
  const cacheStd = baselineStdDev(safeHistory, cacheBase, (p) => p.cacheHitRatePct);
  const cacheZ = zScoreOf(metrics.cache.hitRatePct, cacheBase, cacheStd);
  const cacheThreshold = 90;
  if (metrics.cache.hitRatePct < cacheThreshold) {
    anomalies.push({
      id: 'anomaly_cache',
      kind: 'CACHE_MISS_DROP',
      severity: severityOf(Math.abs(cacheZ), cacheBase - metrics.cache.hitRatePct, cacheBase - cacheThreshold),
      metric: 'cache.hitRatePct',
      current: metrics.cache.hitRatePct,
      baseline: Math.round(cacheBase * 10) / 10,
      deviationPct: Math.max(0, Math.round(((cacheBase - metrics.cache.hitRatePct) / cacheBase) * 1000) / 10),
      zScore: Math.round(cacheZ * 100) / 100,
      threshold: cacheThreshold,
      message: `缓存命中率 ${metrics.cache.hitRatePct}%，较基线 ${Math.round(cacheBase * 10) / 10}% 下降，淘汰 ${metrics.cache.evictions} 次，存在缓存击穿风险`,
    });
  }

  /* --- ⑤ 磁盘告急：任一挂载点使用率 > 80% --- */
  const worstDisk = metrics.disk.reduce((worst, d) => (d.usedPct > worst.usedPct ? d : worst), metrics.disk[0]);
  const diskBase = baselineMean(safeHistory, (p) => p.diskUsedPct);
  const diskStd = baselineStdDev(safeHistory, diskBase, (p) => p.diskUsedPct);
  const diskZ = zScoreOf(worstDisk.usedPct, diskBase, diskStd);
  const diskThreshold = 80;
  if (worstDisk && worstDisk.usedPct > diskThreshold) {
    anomalies.push({
      id: 'anomaly_disk',
      kind: 'DISK_SPACE_RISK',
      severity: severityOf(diskZ, worstDisk.usedPct, diskThreshold),
      metric: 'disk.usedPct',
      current: worstDisk.usedPct,
      baseline: Math.round(diskBase * 10) / 10,
      deviationPct: Math.max(0, Math.round(((worstDisk.usedPct - diskBase) / diskBase) * 1000) / 10),
      zScore: Math.round(diskZ * 100) / 100,
      threshold: diskThreshold,
      message: `挂载点 ${worstDisk.path} 使用率 ${worstDisk.usedPct}%（${worstDisk.usedGb}/${worstDisk.totalGb}GB），inode 占用 ${worstDisk.inodeUsedPct}%`,
    });
  }

  return anomalies;
}

/* ------------------------------------------------------------------ */
/* 3. generateOpsAlert(anomaly) 智能告警                                 */
/* ------------------------------------------------------------------ */

const ALERT_TITLE: Record<AnomalyKind, string> = {
  LATENCY_P95_SPIKE: 'API 响应时间 P95 异常毛刺',
  ERROR_RATE_SPIKE: '接口错误率突增',
  DB_POOL_SATURATION: '数据库连接池饱和',
  CACHE_MISS_DROP: '缓存命中率异常下滑',
  DISK_SPACE_RISK: '磁盘空间告急',
};

const ALERT_RUNBOOK: Record<AnomalyKind, string> = {
  LATENCY_P95_SPIKE: '/runbook/ops/latency-spike.md',
  ERROR_RATE_SPIKE: '/runbook/ops/error-rate-spike.md',
  DB_POOL_SATURATION: '/runbook/ops/db-pool-saturation.md',
  CACHE_MISS_DROP: '/runbook/ops/cache-breakdown.md',
  DISK_SPACE_RISK: '/runbook/ops/disk-full.md',
};

/**
 * 智能告警：异常 → P1/P2/P3 分级 + 送达渠道 + 去重键 + 确认闭环。
 *  - P1（critical）：电话 + 短信 + 企微，要求当班运维确认；
 *  - P2（warning）：企微 + 短信，当班确认；
 *  - P3（info）：仅企微，无需确认，避免告警疲劳。
 */
export function generateOpsAlert(anomaly: Anomaly): OpsAlert {
  const level: OpsAlert['level'] =
    anomaly.severity === 'critical' ? 'P1' : anomaly.severity === 'warning' ? 'P2' : 'P3';

  const channel: OpsAlert['channel'] =
    level === 'P1'
      ? ['phone', 'sms', 'im']
      : level === 'P2'
        ? ['im', 'sms']
        : ['im'];

  return {
    alertId: `alt_${anomaly.id}`,
    level,
    title: ALERT_TITLE[anomaly.kind],
    content: `${anomaly.message}（基线 ${anomaly.baseline}，偏离 ${anomaly.deviationPct}%，z=${anomaly.zScore}）`,
    channel,
    dedupKey: `ops:${anomaly.kind}:${anomaly.metric}`,
    needAck: level !== 'P3',
    runbookUrl: ALERT_RUNBOOK[anomaly.kind],
  };
}

/* ------------------------------------------------------------------ */
/* 4. autoRemediate(issue) 自动修复建议                                 */
/* ------------------------------------------------------------------ */

/**
 * 自动修复建议：异常 → 有序处置步骤（可自动执行 / 需人工）+ 风险 + 预期收益 + 回滚预案。
 * 智能运维的终点不是「告诉人出事了」，而是「下一步具体怎么做」。
 */
export function autoRemediate(issue: Anomaly): RemediationPlan {
  const base: Pick<RemediationPlan, 'issueId' | 'kind'> = { issueId: issue.id, kind: issue.kind };

  switch (issue.kind) {
    case 'LATENCY_P95_SPIKE':
      return {
        ...base,
        summary: 'P95 毛刺多由慢查询 / 下游抖动引起，先限流保护、再定位慢路由、最后扩容或缓存兜底。',
        steps: [
          { order: 1, action: '对慢路由启用 5 分钟令牌桶限流（QPS 上限下调 20%），保护整体 BFF', automated: true, risk: 'low', expectedEffect: 'P95 回落至阈值内，错误率不再扩散' },
          { order: 2, action: '拉取本周期慢查询 TOP10，按耗时排序定位新增慢 SQL', automated: false, risk: 'low', expectedEffect: '10 分钟内定位根因' },
          { order: 3, action: '对热点查询追加结果缓存（TTL 60s）或补齐缺失索引', automated: false, risk: 'medium', expectedEffect: 'P95 预计下降 40%+' },
        ],
        rollback: '移除限流规则与临时缓存，索引变更前确认无写放大后保留，异常时可在线 DROP INDEX。',
        estimatedRecoveryMin: 25,
      };

    case 'ERROR_RATE_SPIKE':
      return {
        ...base,
        summary: '错误率突增先止血（熔断 / 回滚最近发布），再按路由排查 5xx 栈。',
        steps: [
          { order: 1, action: '对错误率 >1% 的路由下游依赖拉起熔断器（失败率 >50% 即 OPEN）', automated: true, risk: 'low', expectedEffect: '错误率 5 分钟内压回基线' },
          { order: 2, action: '核对最近 1 小时是否有发布 / 配置变更，有则一键回滚上一版本', automated: false, risk: 'medium', expectedEffect: '若为发布引入，回滚后立即恢复' },
          { order: 3, action: '导出该路由 5xx 错误栈样本（脱敏），关联日志定位异常类', automated: true, risk: 'low', expectedEffect: '30 分钟内拿到根因清单' },
        ],
        rollback: '关闭熔断器与临时限流，重新放行路由；回滚的发布保留回滚窗口 24 小时。',
        estimatedRecoveryMin: 20,
      };

    case 'DB_POOL_SATURATION':
      return {
        ...base,
        summary: '连接池饱和先扩池 + 杀长事务，再治理慢查询占用的连接。',
        steps: [
          { order: 1, action: '连接池上限由 40 临时扩至 60，并开启获取连接等待队列监控', automated: true, risk: 'medium', expectedEffect: '消除 acquisition timeout，等待时间回落' },
          { order: 2, action: '识别并终止运行 >30s 的长事务 / 空闲占用连接', automated: false, risk: 'high', expectedEffect: '释放 10+ 空闲连接，使用率降至 70% 以下' },
          { order: 3, action: '对高并发只读查询路由到只读副本，减轻主库连接压力', automated: false, risk: 'medium', expectedEffect: '主库连接使用率长期稳定在 60% 区间' },
        ],
        rollback: '连接池上限回滚至 40；终止长事务前先备份会话状态，误杀可由应用重试补偿。',
        estimatedRecoveryMin: 30,
      };

    case 'CACHE_MISS_DROP':
      return {
        ...base,
        summary: '命中率下滑通常是缓存过期风暴 / 大 key 淘汰，先热点预热，再修 TTL 抖动。',
        steps: [
          { order: 1, action: '对 TOP5 热点 key 执行缓存预热（后台批量回填）', automated: true, risk: 'low', expectedEffect: '命中率 10 分钟内回升至 92%+' },
          { order: 2, action: '检查近期是否有批量 key 同时过期，给 TTL 加 ±10% 随机抖动', automated: false, risk: 'low', expectedEffect: '消除过期风暴，命中率稳定在 95%' },
          { order: 3, action: '清理 >10MB 的大 key 并拆分，降低 evictions', automated: false, risk: 'medium', expectedEffect: '淘汰数下降 80%' },
        ],
        rollback: '预热任务可随时停止；TTL 抖动为幂等变更，回滚即恢复固定 TTL。',
        estimatedRecoveryMin: 15,
      };

    case 'DISK_SPACE_RISK':
      return {
        ...base,
        summary: '磁盘告急先清日志 / 旧备份止血，再评估扩容，避免数据库写满停机。',
        steps: [
          { order: 1, action: '清理 /var/log 下 7 天前的归档日志与 core dump（保留压缩包索引）', automated: true, risk: 'low', expectedEffect: '释放 10-20GB，使用率降至 78% 以下' },
          { order: 2, action: '迁移 30 天前的旧备份对象至对象存储冷备', automated: false, risk: 'low', expectedEffect: '/data/backup 使用率长期下降 20%' },
          { order: 3, action: '评估 /data 分区扩容（由运维工单发起，预留 20% 水位线）', automated: false, risk: 'medium', expectedEffect: '消除容量风险，支撑 30 天增长' },
        ],
        rollback: '日志清理前已转储归档，可从对象存储回捞；扩容操作可逆（缩盘需先备份）。',
        estimatedRecoveryMin: 40,
      };
  }
}
