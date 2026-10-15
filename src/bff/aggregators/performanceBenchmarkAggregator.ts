/**
 * 健澜科技 jlmedaios - M135-C API 性能基准测试聚合器
 *
 * 本模块仅提供纯函数（耗时测量器可注入，默认走全局 fetch）：
 *  - benchmarkApi(baseUrl, routes, concurrency, sampler?)
 *      对一组 GET 端点按并发上限施加压测采样，输出每条路由的
 *      P50/P95/P99、平均/最小/最大耗时、错误率与吞吐（RPS）；
 *  - generatePerformanceReport(results)
 *      对一组基准结果做汇总：总体错误率、最慢/最差路由、
 *      与内置基线对比，并给出「生产就绪质量门禁」判定结论。
 *
 * 设计约束：
 *  - 统计计算（百分位、汇总、门禁判定）全部确定性、可单测；
 *  - 仅当使用默认 sampler 时才产生网络副作用；测试层注入假
 *    sampler 即可完全离线验证；
 *  - 不读取数据库、不触碰 WebSocket、不引入外部依赖。
 *
 * 指标口径：
 *  - 耗时单位统一为毫秒；百分位采用最近秩法（nearest-rank）；
 *  - 错误 = 非 2xx 状态码，或网络异常（记 status=0）；
 *  - 吞吐 RPS = 样本数 / 该路由全部请求耗时合计（秒）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条基准路由规格 */
export interface BenchmarkRouteSpec {
  /** 路由路径，如 /api/v1/health */
  path: string;
  /** 展示名（缺省取 path） */
  label?: string;
  /** 该路由采样次数（缺省 DEFAULT_SAMPLES） */
  samples?: number;
}

/** 单次采样结果（耗时由 sampler 自行测量） */
export interface BenchmarkSample {
  /** HTTP 状态码；网络异常 / 超时记 0 */
  status: number;
  /** 单次响应耗时（毫秒） */
  durationMs: number;
}

/**
 * 采样器签名：输入完整 URL，输出单次采样结果。
 * 生产实现走全局 fetch；单测注入确定性假实现。
 */
export type Sampler = (url: string) => Promise<BenchmarkSample>;

/** 基线对比 */
export interface BaselineComparison {
  /** 实测 P95 - 基线 P95（ms），正数表示劣化 */
  p95DeltaMs: number;
  /** 实测错误率 - 基线错误率，正数表示劣化 */
  errorRateDelta: number;
  /** 是否相对基线劣化（P95 超基线或错误率超基线） */
  regression: boolean;
}

/** 单条路由基准结果 */
export interface BenchmarkResult {
  /** 路由路径 */
  route: string;
  /** 展示名 */
  label: string;
  /** 实际采样数 */
  samples: number;
  /** 成功数（2xx） */
  successCount: number;
  /** 失败数（非 2xx / 网络异常） */
  errorCount: number;
  /** 错误率（0..1） */
  errorRate: number;
  /** 平均耗时（ms） */
  avgMs: number;
  /** 最小耗时（ms） */
  minMs: number;
  /** P50 耗时（ms） */
  p50Ms: number;
  /** P95 耗时（ms） */
  p95Ms: number;
  /** P99 耗时（ms） */
  p99Ms: number;
  /** 最大耗时（ms） */
  maxMs: number;
  /** 吞吐（请求/秒） */
  throughputRps: number;
  /** 与内置基线的对比 */
  vsBaseline: BaselineComparison;
}

/** 汇总报告 */
export interface BenchmarkReport {
  /** 生成时间（ISO 8601） */
  generatedAt: string;
  /** 受测路由数 */
  routeCount: number;
  /** 总样本数 */
  totalSamples: number;
  /** 总错误数 */
  totalErrors: number;
  /** 总体错误率（0..1） */
  overallErrorRate: number;
  /** 最慢路由（按 P95 降序取首，无数据为 null） */
  slowestByP95: BenchmarkResult | null;
  /** 错误率最高路由（无数据为 null） */
  mostErrorProne: BenchmarkResult | null;
  /** 回归路由清单（相对基线劣化） */
  regressions: BenchmarkResult[];
  /**
   * 生产就绪质量门禁判定：
   *  - pass：全部路由 P95 ≤ p95LimitMs 且错误率 ≤ errorRateLimit，且无回归
   *  - warn：未触发硬门禁，但相对基线有回归，或无样本数据
   *  - fail：任一路由触发硬门禁（P95 超阈值 或 错误率超阈值）
   */
  gate: 'pass' | 'warn' | 'fail';
  /** 门禁判定说明 */
  gateNote: string;
}

/**
 * 生产就绪质量门禁（Production Readiness Gate）：
 * 基准结果未达此标准的接口，不允许进入生产发布流程。
 *  - p95LimitMs：单路由 P95 响应时间硬上限
 *  - errorRateLimit：单路由错误率硬上限
 *  - minSamples：单路由最小有效样本数（不足则统计不可信）
 */
export const READINESS_GATE = {
  p95LimitMs: 500,
  errorRateLimit: 0.01,
  minSamples: 5,
} as const;

/**
 * 内置性能基线（首轮实测留档，用于版本间漂移对比）。
 * 后续每次基准测试输出 vsBaseline，便于发现劣化。
 */
export const DEFAULT_BASELINE = {
  /** 基线 P95（ms） */
  p95Ms: 300,
  /** 基线错误率（0..1） */
  errorRate: 0.005,
  /** 基线说明 */
  note: 'M135-C 首轮基线（health / model-info 轻量端点，并发 5，每路由 10 样本）',
} as const;

/** 每条路由默认采样次数 */
export const DEFAULT_SAMPLES = 10;
/** 默认并发度 */
export const DEFAULT_CONCURRENCY = 5;
/** 默认单次请求超时（ms），避免基准被慢请求拖死 */
export const DEFAULT_TIMEOUT_MS = 5000;

/**
 * 最近秩法（nearest-rank）百分位。
 *
 * 口径：rank = ceil(p/100 * n)，取升序数组第 rank 个元素（1-based）。
 *  - 空数组返回 0；
 *  - p 越界时夹取到 [0,100]；
 *  - 不修改入参数组。
 *
 * @param latencies 耗时数组（ms，无需预排序）
 * @param p 百分位（0..100）
 * @returns 百分位耗时（ms）
 *
 * @example
 * percentileOf([10, 20, 30, 40, 50], 50); // 30
 * percentileOf([10, 20, 30, 40, 50], 95); // 50
 */
export function percentileOf(latencies: readonly number[], p: number): number {
  const n = latencies.length;
  if (n === 0) return 0;
  if (n === 1) return latencies[0];
  const sorted = [...latencies].sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(100, p));
  const rank = Math.ceil((clamped / 100) * n);
  const idx = Math.max(0, Math.min(n - 1, rank - 1));
  return sorted[idx];
}

/**
 * 并发限流器：将 items 至多按 limit 个并发跑 worker，结果保持入参顺序。
 *
 * @param items 待处理元素
 * @param limit 并发上限（自动夹取到 [1, items.length]）
 * @param worker 单元素处理函数
 */
async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<BenchmarkSample>,
): Promise<BenchmarkSample[]> {
  const results: BenchmarkSample[] = new Array(items.length);
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length));
  async function loop(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  }
  const runners: Promise<void>[] = [];
  for (let i = 0; i < size; i += 1) runners.push(loop());
  await Promise.all(runners);
  return results;
}

/**
 * 计算单条路由的基准统计（纯函数，不发起网络请求）。
 *
 * 统计口径：
 *  - 错误 = 状态码非 2xx（含网络异常 status=0）；
 *  - 错误率 = 错误数 / 样本数；
 *  - P50/P95/P99 采用最近秩法；
 *  - 吞吐 RPS = 样本数 / 全部样本耗时合计（秒）；
 *  - vsBaseline 与 DEFAULT_BASELINE 对比。
 *
 * @param spec 路由规格（取 label）
 * @param samples 该路由全部采样
 * @param baseline 对比基线（缺省 DEFAULT_BASELINE）
 * @returns 单路由基准结果
 */
export function computeBenchmarkResult(
  spec: Pick<BenchmarkRouteSpec, 'path' | 'label'>,
  samples: readonly BenchmarkSample[],
  baseline: Pick<typeof DEFAULT_BASELINE, 'p95Ms' | 'errorRate'> = DEFAULT_BASELINE,
): BenchmarkResult {
  const n = samples.length;
  const successCount = samples.filter((s) => s.status >= 200 && s.status < 300).length;
  const errorCount = n - successCount;
  const latencies = samples.map((s) => s.durationMs);
  const totalMs = latencies.reduce((acc, v) => acc + v, 0);
  const p95Ms = Math.round(percentileOf(latencies, 95));
  const p95DeltaMs = Math.round(p95Ms - baseline.p95Ms);
  const errorRate = n > 0 ? errorCount / n : 0;
  const errorRateDelta = Number((errorRate - baseline.errorRate).toFixed(4));

  return {
    route: spec.path,
    label: spec.label ?? spec.path,
    samples: n,
    successCount,
    errorCount,
    errorRate: Number(errorRate.toFixed(4)),
    avgMs: n > 0 ? Math.round((totalMs / n) * 10) / 10 : 0,
    minMs: Math.round(percentileOf(latencies, 0)),
    p50Ms: Math.round(percentileOf(latencies, 50)),
    p95Ms,
    p99Ms: Math.round(percentileOf(latencies, 99)),
    maxMs: Math.round(percentileOf(latencies, 100)),
    throughputRps: totalMs > 0 ? Number(((n / totalMs) * 1000).toFixed(2)) : 0,
    vsBaseline: {
      p95DeltaMs,
      errorRateDelta,
      regression: p95DeltaMs > 0 || errorRateDelta > 0,
    },
  };
}

/**
 * 默认采样器：全局 fetch + 超时控制。
 *
 *  - 超时 / 网络异常 → 返回 { status: 0, durationMs: 实际耗时 }；
 *  - 正常响应 → 丢弃响应体（基准只关心耗时与状态码）。
 *
 * @param url 完整 URL
 * @param timeoutMs 单次超时（ms）
 */
export function defaultSampler(timeoutMs: number = DEFAULT_TIMEOUT_MS): Sampler {
  return async (url: string): Promise<BenchmarkSample> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const resp = await fetch(url, { method: 'GET', signal: controller.signal });
      return { status: resp.status, durationMs: Date.now() - started };
    } catch {
      return { status: 0, durationMs: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * API 性能基准测试（纯编排函数）。
 *
 * 行为：
 *  - 对入参 routes 逐条发起 GET 采样，每条路由 samples 次；
 *  - 单条路由内部按 concurrency 限制在途请求数（路由间串行）；
 *  - 统计计算委托 computeBenchmarkResult（确定性、可单测）；
 *  - 仅当 sampler 缺省时使用 defaultSampler（产生真实网络副作用）。
 *
 * @param baseUrl 服务根地址（如 http://127.0.0.1:8080）
 * @param routes 受测路由清单
 * @param concurrency 单路由并发上限（缺省 DEFAULT_CONCURRENCY，夹取到 [1,50]）
 * @param sampler 可注入采样器（测试用；缺省走 fetch）
 * @returns 每条路由的基准结果（保持入参顺序）
 *
 * @example
 * await benchmarkApi('http://127.0.0.1:8080', [{ path: '/api/v1/health' }], 5);
 */
export async function benchmarkApi(
  baseUrl: string,
  routes: readonly BenchmarkRouteSpec[],
  concurrency: number = DEFAULT_CONCURRENCY,
  sampler: Sampler = defaultSampler(),
): Promise<BenchmarkResult[]> {
  const limit = Math.max(1, Math.min(50, Math.floor(concurrency) || DEFAULT_CONCURRENCY));
  const results: BenchmarkResult[] = [];
  const root = baseUrl.replace(/\/+$/, '');

  for (const spec of routes) {
    const samplesCount = Math.max(1, Math.floor(spec.samples ?? DEFAULT_SAMPLES));
    const target = `${root}${spec.path.startsWith('/') ? spec.path : `/${spec.path}`}`;
    const samples = await runPool(
      new Array(samplesCount).fill(null),
      limit,
      async () => sampler(target),
    );
    results.push(computeBenchmarkResult(spec, samples));
  }
  return results;
}

/**
 * 对一组基准结果生成汇总报告（含生产就绪质量门禁判定）。
 *
 * 门禁口径：
 *  - fail：任一路由 P95 > READINESS_GATE.p95LimitMs，
 *          或错误率 > READINESS_GATE.errorRateLimit，
 *          或样本数 < READINESS_GATE.minSamples（统计不可信）；
 *  - warn：未触发硬门禁，但存在相对基线回归，或无样本数据；
 *  - pass：全部路由满足门禁且无回归。
 *
 * @param results 单路由基准结果
 * @param generatedAt 生成时间（可注入便于测试）
 * @returns 汇总报告
 */
export function generatePerformanceReport(
  results: readonly BenchmarkResult[],
  generatedAt: string = new Date().toISOString(),
): BenchmarkReport {
  const routeCount = results.length;
  const totalSamples = results.reduce((acc, r) => acc + r.samples, 0);
  const totalErrors = results.reduce((acc, r) => acc + r.errorCount, 0);
  const overallErrorRate = totalSamples > 0 ? totalErrors / totalSamples : 0;

  const slowestByP95 =
    routeCount === 0
      ? null
      : results.reduce((a, b) => (b.p95Ms > a.p95Ms ? b : a));
  const mostErrorProne =
    routeCount === 0
      ? null
      : results.reduce((a, b) => (b.errorRate > a.errorRate ? b : a));
  const regressions = results.filter((r) => r.vsBaseline.regression);

  // 生产就绪质量门禁判定（硬指标优先）
  const breaches = results.filter(
    (r) =>
      r.p95Ms > READINESS_GATE.p95LimitMs ||
      r.errorRate > READINESS_GATE.errorRateLimit ||
      r.samples < READINESS_GATE.minSamples,
  );

  let gate: BenchmarkReport['gate'] = 'pass';
  let gateNote = '全部路由满足生产就绪质量门禁';
  if (routeCount === 0) {
    gate = 'warn';
    gateNote = '无基准数据，无法判定门禁';
  } else if (breaches.length > 0) {
    gate = 'fail';
    gateNote = `以下路由触发生产就绪质量门禁：${breaches
      .map((r) => r.route)
      .join('、')}`;
  } else if (regressions.length > 0) {
    gate = 'warn';
    gateNote = `未触发硬门禁，但 ${regressions.length} 条路由相对基线回归：${regressions
      .map((r) => r.route)
      .join('、')}`;
  }

  return {
    generatedAt,
    routeCount,
    totalSamples,
    totalErrors,
    overallErrorRate: Number(overallErrorRate.toFixed(4)),
    slowestByP95,
    mostErrorProne,
    regressions,
    gate,
    gateNote,
  };
}
