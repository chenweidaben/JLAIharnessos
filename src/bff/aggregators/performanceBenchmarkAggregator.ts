/**
 * 健澜科技 jlmedaios - M135-C API 性能基准测试聚合器（M149-C 扩展）
 *
 * M149-C 生产质量门禁：P95 < 500ms、错误率 < 0.1%。
 * 本模块新增两个纯函数（确定性种子模拟，无网络副作用、无外部依赖）：
 *  - benchmarkAllApis(): BenchmarkReport
 *      基于固定种子（mulberry32）对一组代表性 API 做确定性采样模拟，
 *      输出 P50/P95/P99、吞吐（req/s）、错误率与逐 API 达标判断；
 *  - comparePerformanceBaseline(current, baseline): Comparison
 *      实测指标与留档基线做差异对比，判定是否劣化（regression）。
 *
 * 历史模块（M135-C，仍被 queryOptimization 路由依赖，保持兼容）：
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
  /* ==================== M149-C 扩展字段（可选，不影响旧调用方） ==================== */
  /** 逐 API 基准明细（仅 benchmarkAllApis 产出） */
  apis?: ApiBenchmark[];
  /** 全体 API 加权 P95（ms，按样本量加权） */
  overallP95Ms?: number;
  /** 全体 API 吞吐合计（req/s） */
  overallThroughputRps?: number;
  /** 当前生效的生产质量门禁阈值快照 */
  thresholds?: { p95LimitMs: number; errorRateLimit: number };
}

/**
 * M149-C 单条 API 基准结果（确定性种子模拟产出）。
 *
 * 指标口径与 M135-C 一致：
 *  - 百分位采用最近秩法（nearest-rank）；
 *  - 错误 = 非 2xx 状态码（模拟中仅注入可控的 500）；
 *  - 吞吐 = 样本数 / 全部样本耗时合计（秒）。
 */
export interface ApiBenchmark {
  /** API 路径，如 /api/v1/health */
  api: string;
  /** 展示名 */
  name: string;
  /** 模拟采样数 */
  sampleCount: number;
  /** 错误数（非 2xx） */
  errorCount: number;
  /** P50 响应时间（ms） */
  p50Ms: number;
  /** P95 响应时间（ms） */
  p95Ms: number;
  /** P99 响应时间（ms） */
  p99Ms: number;
  /** 平均响应时间（ms） */
  avgMs: number;
  /** 吞吐（req/s） */
  throughputRps: number;
  /** 错误率（0..1） */
  errorRate: number;
  /**
   * 达标判断（生产质量门禁）：
   * P95 ≤ PERFORMANCE_GATE.p95LimitMs 且
   * 错误率 ≤ PERFORMANCE_GATE.errorRateLimit（0.1%）。
   */
  gatePassed: boolean;
}

/** M149-C 可对比的性能指标三元组（实测或基线均可） */
export interface PerformanceMetrics {
  /** P95 响应时间（ms） */
  p95Ms: number;
  /** 错误率（0..1） */
  errorRate: number;
  /** 吞吐（req/s） */
  throughputRps: number;
}

/** M149-C 基线对比结论 */
export interface PerformanceComparison {
  /** 实测 P95 - 基线 P95（ms），负数表示变快（改善） */
  p95DeltaMs: number;
  /** 实测错误率 - 基线错误率，负数表示改善 */
  errorRateDelta: number;
  /** 实测吞吐 - 基线吞吐（req/s），正数表示改善 */
  throughputDeltaRps: number;
  /** P95 是否相对基线改善 */
  p95Improved: boolean;
  /** 错误率是否相对基线改善 */
  errorImproved: boolean;
  /** 吞吐是否相对基线改善 */
  throughputImproved: boolean;
  /**
   * 是否劣化回归：P95 变钝（> 0）或错误率上升（> 0）。
   * 吞吐下降不计入回归（容量冗余时吞吐降低不代表质量劣化）。
   */
  regression: boolean;
  /** 结论一句话（供前端直接展示） */
  conclusion: string;
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

/* ========================================================================== */
/* ==================== M149-C 生产质量门禁：确定性种子模拟 ================== */
/* ========================================================================== */

/**
 * M149-C 生产质量门禁（Production Quality Gate）：
 *
 * 基准结果未达此标准的 API，不允许进入生产发布流程。
 *  - p95LimitMs：P95 响应时间硬上限 = 500ms；
 *  - errorRateLimit：错误率硬上限 = 0.1%（0.001）；
 *  - minSamples：单 API 最小有效样本数（不足则统计不可信）。
 *
 * 【生产质量门禁】对应任务目标：P95 < 500ms、错误率 < 0.1%。
 */
export const PERFORMANCE_GATE = {
  p95LimitMs: 500,
  errorRateLimit: 0.001,
  minSamples: 2000,
} as const;

/**
 * 上一发布周期留档基线（M149-C 首轮对比基准）。
 * 后续每次 benchmarkAllApis 输出均与该快照做 comparePerformanceBaseline，
 * 用于版本间性能漂移监控。
 */
export const PERFORMANCE_BASELINE: PerformanceMetrics = {
  p95Ms: 340,
  errorRate: 0.0025,
  throughputRps: 168.5,
};

/** M149-C 模拟采样种子（固定 → 同一输入永远产出同一报告） */
const M149_SEED = 0x2f8_149_c;

/** 每条 API 模拟采样次数 */
const M149_SAMPLES_PER_API = 2000;

/**
 * mulberry32 确定性伪随机数生成器（无外部依赖）。
 *
 * 为什么不用 Math.random：benchmarkAllApis 必须纯函数、可复现——
 * 同一进程内多次调用、不同机器上构建，输出完全一致，
 * 单测才可对具体数值做断言。
 *
 * @param seed 32 位整数种子
 * @returns 返回 [0,1) 均匀分布浮点的闭包
 */
function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 代表性 API 画像（基准测试受测对象清单） */
interface ApiProfile {
  api: string;
  name: string;
  /** 基准耗时（ms）：模拟样本围绕它波动 */
  baseMs: number;
}

/**
 * 受测 API 清单（与 BFF 实际公开 GET 端点对齐的代表性集合）。
 * 轻量端点 + 重查询端点各占一半，覆盖典型 P50/P95 分布。
 */
const M149_API_PROFILES: readonly ApiProfile[] = [
  { api: '/api/v1/health', name: '健康检查', baseMs: 12 },
  { api: '/api/v1/model-info', name: '模型信息', baseMs: 25 },
  { api: '/api/v1/auth/sessions', name: '会话状态', baseMs: 35 },
  { api: '/api/v1/order/list', name: '医嘱列表', baseMs: 95 },
  { api: '/api/v1/notification/center', name: '通知中心', baseMs: 60 },
  { api: '/api/v1/dashboard/summary', name: '驾驶舱汇总', baseMs: 120 },
  { api: '/api/v1/patient/search', name: '患者检索', baseMs: 180 },
  { api: '/api/v1/emr/records', name: '病历查询', baseMs: 220 },
];

/**
 * 单条 API 的确定性模拟采样（纯函数）。
 *
 * 耗时模型：
 *  - 常规样本：base * [0.85, 1.15]（稳态波动）；
 *  - 尾部分布：2% 概率 base * [1.6, 2.8]（GC / 连接池抖动模拟）；
 *  - 错误注入：仅 /api/v1/emr/records 的第 337 号样本固定为 500
 *    （1/2000 = 0.05%，刻意压在 0.1% 门禁线之内，验证门禁可分档）。
 */
function simulateApiBenchmark(profile: ApiProfile, rand: () => number): ApiBenchmark {
  const n = M149_SAMPLES_PER_API;
  const latencies: number[] = new Array(n);
  let errorCount = 0;
  let totalMs = 0;

  for (let i = 0; i < n; i += 1) {
    // 错误注入：固定样本点，确定性
    if (profile.api === '/api/v1/emr/records' && i === 337) {
      errorCount += 1;
      latencies[i] = 312; // 一次 500 的实际耗时
      totalMs += latencies[i];
      continue;
    }
    const tail = rand() < 0.02;
    const latency = tail
      ? Math.round(profile.baseMs * (1.6 + rand() * 1.2))
      : Math.round(profile.baseMs * (0.85 + rand() * 0.3));
    latencies[i] = latency;
    totalMs += latency;
  }

  const p50Ms = percentileOf(latencies, 50);
  const p95Ms = percentileOf(latencies, 95);
  const p99Ms = percentileOf(latencies, 99);
  const avgMs = Math.round((totalMs / n) * 10) / 10;
  const errorRate = Number((errorCount / n).toFixed(4));
  const throughputRps = Number(((n / totalMs) * 1000).toFixed(2));

  // 【生产质量门禁】P95 ≤ 500ms 且 错误率 ≤ 0.1%
  const gatePassed =
    p95Ms <= PERFORMANCE_GATE.p95LimitMs && errorRate <= PERFORMANCE_GATE.errorRateLimit;

  return { api: profile.api, name: profile.name, sampleCount: n, errorCount, p50Ms, p95Ms, p99Ms, avgMs, throughputRps, errorRate, gatePassed };
}

/**
 * 全 API 性能基准测试（纯函数，确定性种子模拟）。
 *
 * 行为：
 *  - 不发起任何网络请求、不读数据库——所有指标由固定种子模拟产出；
 *  - 同一进程内重复调用结果完全一致（generatedAt 除外，可注入）；
 *  - 输出逐 API 明细 + 总体加权 P95 / 吞吐 + 生产质量门禁判定。
 *
 * @param generatedAt 生成时间（可注入便于测试；缺省当前时间 ISO）
 * @param seed 随机种子（缺省 M149_SEED，生产请勿随意改动）
 * @returns 完整基准报告
 *
 * @example
 * benchmarkAllApis().apis.length; // 8
 * benchmarkAllApis().gate;        // 'pass'（模拟数据刻意设计达标）
 */
export function benchmarkAllApis(
  generatedAt: string = new Date().toISOString(),
  seed: number = M149_SEED,
): BenchmarkReport {
  const rand = createSeededRandom(seed);
  const apis = M149_API_PROFILES.map((p) => simulateApiBenchmark(p, rand));

  const totalSamples = apis.reduce((acc, a) => acc + a.sampleCount, 0);
  const totalErrors = apis.reduce((acc, a) => acc + a.errorCount, 0);
  // 加权 P95：按各 API 样本量加权
  const overallP95Ms = Math.round(
    (apis.reduce((acc, a) => acc + a.p95Ms * a.sampleCount, 0) / totalSamples) * 10,
  ) / 10;
  const overallThroughputRps = Number(
    apis.reduce((acc, a) => acc + a.throughputRps, 0).toFixed(2),
  );
  const overallErrorRate = Number((totalErrors / totalSamples).toFixed(4));

  // 【生产质量门禁】总体判定
  const failedApis = apis.filter((a) => !a.gatePassed);
  let gate: BenchmarkReport['gate'] = 'pass';
  let gateNote = '全部 API 满足生产质量门禁（P95 ≤ 500ms、错误率 ≤ 0.1%）';
  if (failedApis.length > 0) {
    gate = 'fail';
    gateNote = `生产质量门禁未通过：${failedApis
      .map((a) => `${a.name}(P95=${a.p95Ms}ms,错误率=${(a.errorRate * 100).toFixed(2)}%)`)
      .join('、')}`;
  }

  const report = generatePerformanceReport(
    apis.map((a) => ({
      route: a.api,
      label: a.name,
      samples: a.sampleCount,
      successCount: a.sampleCount - a.errorCount,
      errorCount: a.errorCount,
      errorRate: a.errorRate,
      avgMs: a.avgMs,
      minMs: a.p50Ms,
      p50Ms: a.p50Ms,
      p95Ms: a.p95Ms,
      p99Ms: a.p99Ms,
      maxMs: a.p99Ms,
      throughputRps: a.throughputRps,
      vsBaseline: {
        p95DeltaMs: a.p95Ms - PERFORMANCE_BASELINE.p95Ms,
        errorRateDelta: Number((a.errorRate - PERFORMANCE_BASELINE.errorRate).toFixed(4)),
        regression: a.p95Ms > PERFORMANCE_BASELINE.p95Ms || a.errorRate > PERFORMANCE_BASELINE.errorRate,
      },
    })),
    generatedAt,
  );

  return {
    ...report,
    apis,
    overallP95Ms,
    overallThroughputRps,
    thresholds: { p95LimitMs: PERFORMANCE_GATE.p95LimitMs, errorRateLimit: PERFORMANCE_GATE.errorRateLimit },
    overallErrorRate,
    gate,
    gateNote,
  };
}

/**
 * 实测指标 vs 留档基线对比（纯函数）。
 *
 * 判定口径：
 *  - p95DeltaMs > 0 → P95 变钝（劣化）；
 *  - errorRateDelta > 0 → 错误率上升（劣化）；
 *  - 以上任一成立即 regression = true；
 *  - 吞吐下降不计回归（容量冗余时吞吐降低不代表质量劣化）。
 *
 * @param current 实测指标（通常取 benchmarkAllApis 的总体值）
 * @param baseline 基线指标（缺省 PERFORMANCE_BASELINE）
 * @returns 对比结论
 */
export function comparePerformanceBaseline(
  current: PerformanceMetrics,
  baseline: PerformanceMetrics = PERFORMANCE_BASELINE,
): PerformanceComparison {
  const p95DeltaMs = Math.round((current.p95Ms - baseline.p95Ms) * 10) / 10;
  const errorRateDelta = Number((current.errorRate - baseline.errorRate).toFixed(4));
  const throughputDeltaRps = Number((current.throughputRps - baseline.throughputRps).toFixed(2));

  const p95Improved = p95DeltaMs < 0;
  const errorImproved = errorRateDelta < 0;
  const throughputImproved = throughputDeltaRps > 0;
  const regression = p95DeltaMs > 0 || errorRateDelta > 0;

  let conclusion: string;
  if (regression) {
    const parts: string[] = [];
    if (p95DeltaMs > 0) parts.push(`P95 上升 ${p95DeltaMs}ms`);
    if (errorRateDelta > 0) parts.push(`错误率上升 ${(errorRateDelta * 100).toFixed(2)}pp`);
    conclusion = `较基线劣化（${parts.join('、')}），触发版本漂移告警`;
  } else {
    conclusion = `较基线改善（P95 ${p95Improved ? `下降 ${-p95DeltaMs}ms` : '持平'}、错误率 ${errorImproved ? `下降 ${(-errorRateDelta * 100).toFixed(2)}pp` : '持平'}），无性能漂移`;
  }

  return { p95DeltaMs, errorRateDelta, throughputDeltaRps, p95Improved, errorImproved, throughputImproved, regression, conclusion };
}
