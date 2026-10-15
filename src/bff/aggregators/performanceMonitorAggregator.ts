/**
 * 健澜科技 jlmedaios - 系统性能监控聚合器（M123-D）
 *
 * 分层：
 *  - 纯函数：measurePerformance / computePercentiles / identifySlowRoutes /
 *    aggregatePerformance。不读时钟、不访问 IO、不修改入参（sort 全部在副本上
 *    进行），可直接单测。
 *  - 进程内采集：recordPerformance / recordRequestPerformance 写入有界环形缓冲
 *    （默认 5000 条，零新依赖），由 server.ts 在请求收尾时一行接入；
 *    listPerformanceRecords 返回快照副本，供 admin 路由读取。
 *
 * 生产安全加固：
 *  - 环形缓冲有界（MAX_SAMPLES），流量洪峰 / 慢查询风暴下不会内存无限增长；
 *  - 纯函数对空数组、单样本、负时长（时钟回拨）全部防御，返回 0 / 空集而非抛错；
 *  - 只记录 route 模板（如 /api/v1/admin/login-logs）与状态码，不记录用户标识、
 *    查询串、请求体，避免把 PII 写入性能采样；
 *  - 采样不落库、不写文件、不外发，进程重启即清空，仅用于运行时观测；
 *  - listPerformanceRecords 返回深拷贝副本，外部无法篡改内部缓冲。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 单条请求性能采样 */
export interface PerformanceRecord {
  /** 路由模板（不是完整 URL，不含查询串 / 用户标识） */
  route: string;
  /** 请求开始时间（epoch ms） */
  startTime: number;
  /** 请求结束时间（epoch ms） */
  endTime: number;
  /** 耗时（ms），已做 max(0, ...) 防御 */
  durationMs: number;
  /** HTTP 状态码 */
  statusCode: number;
  /** 是否视为错误（statusCode >= 400） */
  isError: boolean;
  /** 采样落盘时间（epoch ms），与 endTime 一致，便于按天分桶 */
  recordedAt: number;
}

/** 分位数结果（毫秒） */
export interface Percentiles {
  p50: number;
  p95: number;
  p99: number;
}

/** 慢接口聚合行 */
export interface SlowRoute {
  route: string;
  /** 该路由采样条数 */
  count: number;
  /** 平均耗时（ms，保留 1 位小数） */
  avgDurationMs: number;
  /** p95 耗时（ms） */
  p95DurationMs: number;
  /** 最大耗时（ms） */
  maxDurationMs: number;
  /** 错误条数（statusCode >= 400） */
  errorCount: number;
}

/** 按天错误率趋势点 */
export interface ErrorRatePoint {
  /** YYYY-MM-DD（本地时区） */
  date: string;
  total: number;
  errors: number;
  /** 0..1，保留 4 位小数 */
  errorRate: number;
}

/** aggregatePerformance 返回给 admin 面板的汇总视图 */
export interface PerformanceSummary {
  /** 采样窗口内请求总数（任务口径 dailyRequests） */
  dailyRequests: number;
  p50: number;
  p95: number;
  p99: number;
  /** 按平均耗时降序的慢接口 Top10（不按阈值过滤，阈值用于前端着色） */
  slowTop10: SlowRoute[];
  /** 按天错误率趋势（日期升序） */
  errorRateTrend: ErrorRatePoint[];
}

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：把一次请求的起止时间与状态码归一为 PerformanceRecord。
 * 负时长（时钟回拨 / 异常入参）防御为 0，不抛错。
 */
export function measurePerformance(
  route: string,
  startTime: number,
  endTime: number,
  statusCode = 200,
): PerformanceRecord {
  const durationMs = Math.max(0, Math.round(endTime - startTime));
  return {
    route,
    startTime,
    endTime,
    durationMs,
    statusCode,
    isError: statusCode >= 400,
    recordedAt: endTime,
  };
}

/**
 * 纯函数：计算 p50 / p95 / p99。
 * 口径：nearest-rank（rank = ceil(p/100 * n)，索引 = rank - 1），空样本返回全 0。
 * 在副本上排序，不修改入参。
 */
export function computePercentiles(samples: number[]): Percentiles {
  const sorted = (samples ?? [])
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return { p50: 0, p95: 0, p99: 0 };

  const pick = (p: number): number => {
    const rank = Math.ceil((p / 100) * sorted.length);
    const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
    return sorted[idx];
  };

  return { p50: pick(50), p95: pick(95), p99: pick(99) };
}

/**
 * 纯函数：按 route 聚合，挑出平均耗时超过 thresholdMs 的慢接口，
 * 结果按平均耗时降序返回。thresholdMs <= 0 时返回空集（无意义阈值防御）。
 */
export function identifySlowRoutes(
  records: PerformanceRecord[],
  thresholdMs: number,
): SlowRoute[] {
  const list = Array.isArray(records) ? records : [];
  if (list.length === 0 || !(thresholdMs > 0)) return [];

  const byRoute = new Map<string, PerformanceRecord[]>();
  for (const r of list) {
    const bucket = byRoute.get(r.route) ?? [];
    bucket.push(r);
    byRoute.set(r.route, bucket);
  }

  const result: SlowRoute[] = [];
  for (const [route, bucket] of byRoute.entries()) {
    const durations = bucket.map((r) => r.durationMs);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / bucket.length;
    if (avg > thresholdMs) {
      result.push({
        route,
        count: bucket.length,
        avgDurationMs: Math.round(avg * 10) / 10,
        p95DurationMs: computePercentiles(durations).p95,
        maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
        errorCount: bucket.filter((r) => r.isError).length,
      });
    }
  }

  result.sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  return result;
}

/**
 * 纯函数：汇总采样窗口 → 请求量 / 分位数 / 慢接口 Top10 / 按天错误率趋势。
 * 不依赖任何模块级状态，可直接单测。
 */
export function aggregatePerformance(records: PerformanceRecord[]): PerformanceSummary {
  const list = Array.isArray(records) ? records : [];
  if (list.length === 0) {
    return {
      dailyRequests: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      slowTop10: [],
      errorRateTrend: [],
    };
  }

  const durations = list.map((r) => r.durationMs);
  const pct = computePercentiles(durations);

  /* ---- 按路由聚合：平均耗时降序，取 Top10 ---- */
  const byRoute = new Map<string, PerformanceRecord[]>();
  for (const r of list) {
    const bucket = byRoute.get(r.route) ?? [];
    bucket.push(r);
    byRoute.set(r.route, bucket);
  }
  const slowTop10: SlowRoute[] = Array.from(byRoute.entries())
    .map(([route, bucket]) => {
      const durs = bucket.map((r) => r.durationMs);
      const sum = durs.reduce((a, b) => a + b, 0);
      return {
        route,
        count: bucket.length,
        avgDurationMs: Math.round((sum / bucket.length) * 10) / 10,
        p95DurationMs: computePercentiles(durs).p95,
        maxDurationMs: durs.length > 0 ? Math.max(...durs) : 0,
        errorCount: bucket.filter((r) => r.isError).length,
      };
    })
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, 10);

  /* ---- 按天分桶：错误率趋势 ---- */
  const byDay = new Map<string, { total: number; errors: number }>();
  for (const r of list) {
    const d = new Date(r.recordedAt);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const bucket = byDay.get(date) ?? { total: 0, errors: 0 };
    bucket.total += 1;
    if (r.isError) bucket.errors += 1;
    byDay.set(date, bucket);
  }
  const errorRateTrend: ErrorRatePoint[] = Array.from(byDay.entries())
    .map(([date, v]) => ({
      date,
      total: v.total,
      errors: v.errors,
      errorRate:
        v.total > 0 ? Math.round((v.errors / v.total) * 10000) / 10000 : 0,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return {
    dailyRequests: list.length,
    p50: pct.p50,
    p95: pct.p95,
    p99: pct.p99,
    slowTop10,
    errorRateTrend,
  };
}

/* ------------------------------------------------------------------ */
/* 进程内采集（零新依赖，模块级环形缓冲）                                 */
/* ------------------------------------------------------------------ */

/** 生产安全加固：环形缓冲上限，超出后丢弃最旧样本 */
const MAX_SAMPLES = 5000;
const buffer: PerformanceRecord[] = [];

/** 写入一条采样；超限时丢弃最旧样本，保证内存有界 */
export function recordPerformance(record: PerformanceRecord): void {
  buffer.push(record);
  if (buffer.length > MAX_SAMPLES) {
    buffer.splice(0, buffer.length - MAX_SAMPLES);
  }
}

/** server.ts 请求收尾时一行接入：构造并写入采样 */
export function recordRequestPerformance(
  route: string,
  startTime: number,
  endTime: number,
  statusCode: number,
): void {
  recordPerformance(measurePerformance(route, startTime, endTime, statusCode));
}

/** 读取当前采样快照（返回副本，外部无法篡改内部缓冲） */
export function listPerformanceRecords(): PerformanceRecord[] {
  return buffer.map((r) => ({ ...r }));
}
