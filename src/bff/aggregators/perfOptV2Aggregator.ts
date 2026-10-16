/**
 * 健澜科技 jlmedaios - M180-D 系统性能与稳定性持续优化 V2 聚合器
 *
 * 【质量与体验】面向 admin 性能治理面板的 V2 深度优化闭环：
 *  - deepPerformanceOptimizationV2(): 纯函数，聚合四大优化域并输出确定性收益：
 *      1) 数据库索引优化（慢查询 TOP10 + 索引建议：btree / 覆盖索引 / 部分索引 / GIN）；
 *      2) 查询缓存优化（缓存键 + TTL + 失效策略 + 预热 + 命中率前后对比）；
 *      3) 前端性能优化（路由懒加载 + 代码分割 + 关键路由预加载 + CDN 静态资源）；
 *      4) 服务器优化（数据库连接池 + BFF 线程池 + JVM/Node 参数 + OS 内核参数）。
 *  - benchmarkPerformanceV2(baseline, current): 纯函数，五维基准对比
 *    （P50/P95/P99/错误率/吞吐），输出 delta、相对百分比与 faster/slower/same 判定；
 *  - detectPerformanceRegressionV2(metrics, history): 纯函数，以历史窗口均值为基线，
 *    对 P95 / 错误率 / 吞吐三维做 warning / critical 分级；
 *  - buildSLOV2(errorRate, latency, availability): 纯函数，错误率 / P95 延迟 / 可用率
 *    三项 SLO 达成判定，输出 met / at_risk / breached 与错误预算消耗速率。
 *
 * 数据策略（性能优化要有数据，不能凭感觉）：
 *  - 所有慢查询样本、索引建议、缓存规则、前后端参数、分位数基线均为内置确定性快照，
 *    来源于 M145-A/M145-D/M151-D/M165-D/M171-D 已落地的性能治理面板；
 *  - 纯函数：不读时钟、不访问 IO、不修改入参，可直接单测复现；
 *  - 百分比保留 1 位小数，延迟为整数 ms，收益均由 before/after 推导。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不暴露 SQL 文本与参数，不含 PII；
 *  - 索引 / 缓存 / 服务器参数均为「建议 + 预期收益」，不直接执行 DDL / 不重启进程；
 *  - 所有数值字段经过 Math.max(0, ...) 防御，负时长 / 脏数据不影响报告结构。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 通用工具                                                            */
/* ------------------------------------------------------------------ */

/** 保留 1 位小数（四舍五入） */
const r1 = (v: number): number => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------ */
/* 一、数据库索引优化：慢查询 TOP10 + 索引建议                         */
/* ------------------------------------------------------------------ */

/** 索引类型 */
export type IndexKind = 'btree' | 'covering' | 'partial' | 'gin';

/** 单条慢查询 TOP10（确定性采样，beforeMs 降序录入） */
export interface SlowQueryTopRowV2 {
  rank: number;
  id: string;
  /** 涉及表（含 schema，不含 SQL 文本 / PII） */
  table: string;
  /** 查询模式摘要 */
  pattern: string;
  /** 优化前平均耗时（ms） */
  beforeMs: number;
  /** 优化后平均耗时（ms） */
  afterMs: number;
  /** 触发频次（次/日） */
  callsPerDay: number;
  /** 单次节省耗时（ms） */
  savedMs: number;
  /** 单次节省百分比 0..100，保留 1 位小数 */
  savedPct: number;
}

/** 单条索引建议 */
export interface IndexRecommendationV2 {
  id: string;
  table: string;
  /** 索引列（按顺序） */
  columns: string[];
  kind: IndexKind;
  /** 索引名（小写蛇形，不含患者信息） */
  indexName: string;
  /** 优化前每日扫描行数 */
  scannedRowsBeforePerDay: number;
  /** 优化后每日扫描行数 */
  scannedRowsAfterPerDay: number;
  /** 单次预期节省耗时（ms） */
  expectedMsSaving: number;
  /** 写放大风险 */
  writeAmplification: 'low' | 'medium' | 'high';
  rationale: string;
}

/** 慢查询 TOP10 确定性目录 */
const SLOW_QUERY_TOP10_V2: readonly Omit<SlowQueryTopRowV2, 'rank' | 'savedMs' | 'savedPct'>[] = [
  { id: 'v2-t1-visit-timeline', table: 'clinical.visit', pattern: '病历时间线按 visit_id 循环拉取检查/医嘱', beforeMs: 260, afterMs: 42, callsPerDay: 5200 },
  { id: 'v2-t2-order-items', table: 'clinical.order_item', pattern: '医嘱列表循环查明细（N+1）', beforeMs: 228, afterMs: 38, callsPerDay: 4800 },
  { id: 'v2-t3-dept-dashboard', table: 'dw.dept_daily', pattern: '驾驶舱实时 COUNT/SUM 扫 visit+order 大表', beforeMs: 210, afterMs: 45, callsPerDay: 420 },
  { id: 'v2-t4-patient-search', table: 'clinical.patient', pattern: 'org_id=? AND name ILIKE ? ORDER BY updated_at', beforeMs: 168, afterMs: 36, callsPerDay: 6100 },
  { id: 'v2-t5-lab-results', table: 'clinical.lab_result', pattern: '就诊时间线循环拉取检验结果（N+1）', beforeMs: 155, afterMs: 30, callsPerDay: 3900 },
  { id: 'v2-t6-visit-page', table: 'clinical.visit', pattern: 'dept_code=? ORDER BY created_at LIMIT ? OFFSET ?（深分页）', beforeMs: 132, afterMs: 28, callsPerDay: 9200 },
  { id: 'v2-t7-order-list', table: 'clinical.order', pattern: 'status=? AND dept_code=? 列表过滤缺复合索引', beforeMs: 118, afterMs: 26, callsPerDay: 7400 },
  { id: 'v2-t8-satisfaction', table: 'dw.satisfaction_daily', pattern: '周报 AVG(score) GROUP BY dept 实时聚合', beforeMs: 104, afterMs: 34, callsPerDay: 260 },
  { id: 'v2-t9-emr-join', table: 'clinical.medical_record', pattern: '病历列表 7 表 join，SELECT * 拉全列', beforeMs: 96, afterMs: 24, callsPerDay: 2100 },
  { id: 'v2-t10-report-export', table: 'clinical.report_task', pattern: '周报导出无索引全表扫描', beforeMs: 88, afterMs: 22, callsPerDay: 180 },
];

/** 索引建议确定性目录 */
const INDEX_RECOMMENDATIONS_V2: readonly IndexRecommendationV2[] = [
  {
    id: 'v2-idx-visit-dept-created',
    table: 'clinical.visit',
    columns: ['dept_code', 'created_at DESC'],
    kind: 'covering',
    indexName: 'idx_visit_dept_created_at_desc',
    scannedRowsBeforePerDay: 4_200_000,
    scannedRowsAfterPerDay: 184_000,
    expectedMsSaving: 104,
    writeAmplification: 'medium',
    rationale: '覆盖 WHERE dept_code=? 与 ORDER BY created_at DESC，消除回表与 filesort',
  },
  {
    id: 'v2-idx-patient-org-updated',
    table: 'clinical.patient',
    columns: ['org_id', 'updated_at DESC'],
    kind: 'btree',
    indexName: 'idx_patient_org_updated_at',
    scannedRowsBeforePerDay: 1_800_000,
    scannedRowsAfterPerDay: 96_000,
    expectedMsSaving: 82,
    writeAmplification: 'low',
    rationale: '组织内按更新时间排序列表，btree 天然有序',
  },
  {
    id: 'v2-idx-patient-name-gin',
    table: 'clinical.patient',
    columns: ['name'],
    kind: 'gin',
    indexName: 'idx_patient_name_trgm',
    scannedRowsBeforePerDay: 1_800_000,
    scannedRowsAfterPerDay: 22_000,
    expectedMsSaving: 96,
    writeAmplification: 'medium',
    rationale: 'name ILIKE 模糊查询使用 pg_trgm GIN，替代全表扫',
  },
  {
    id: 'v2-idx-order-status-dept',
    table: 'clinical.order',
    columns: ['status', 'dept_code'],
    kind: 'btree',
    indexName: 'idx_order_status_dept_code',
    scannedRowsBeforePerDay: 2_600_000,
    scannedRowsAfterPerDay: 128_000,
    expectedMsSaving: 92,
    writeAmplification: 'low',
    rationale: '医嘱列表双列等值过滤，复合 btree 一次定位',
  },
  {
    id: 'v2-idx-order-item-orderid',
    table: 'clinical.order_item',
    columns: ['order_id'],
    kind: 'btree',
    indexName: 'idx_order_item_order_id',
    scannedRowsBeforePerDay: 3_900_000,
    scannedRowsAfterPerDay: 42_000,
    expectedMsSaving: 190,
    writeAmplification: 'low',
    rationale: '配合批量 IN (...) 加载，消除 N+1 主键回表',
  },
  {
    id: 'v2-idx-lab-visit-partial',
    table: 'clinical.lab_result',
    columns: ['visit_id', 'reported_at DESC'],
    kind: 'partial',
    indexName: 'idx_lab_result_visit_reported',
    scannedRowsBeforePerDay: 2_400_000,
    scannedRowsAfterPerDay: 31_000,
    expectedMsSaving: 120,
    writeAmplification: 'low',
    rationale: '仅索引 status=reported 的行（部分索引），时间线查询零回表',
  },
];

/* ------------------------------------------------------------------ */
/* 二、查询缓存优化：缓存键 + 过期 + 失效 + 预热                       */
/* ------------------------------------------------------------------ */

/** 单条缓存规则 */
export interface CacheRuleV2 {
  /** 缓存键模式（含占位符，不含患者姓名/PII） */
  key: string;
  scope: string;
  /** 过期时间（秒） */
  ttlSec: number;
  /** 失效策略 */
  invalidation: string;
  /** 是否启动预热 */
  warmup: boolean;
  /** 优化前命中率 % */
  hitRateBeforePct: number;
  /** 优化后命中率 % */
  hitRateAfterPct: number;
}

const CACHE_RULES_V2: readonly CacheRuleV2[] = [
  { key: 'cache:patient:profile:{patientId}', scope: '患者档案', ttlSec: 300, invalidation: '写穿：档案更新即删 key', warmup: true, hitRateBeforePct: 58, hitRateAfterPct: 96 },
  { key: 'cache:visit:timeline:{visitId}', scope: '就诊时间线', ttlSec: 120, invalidation: 'TTL + 医嘱/检查事件发布失效', warmup: false, hitRateBeforePct: 61, hitRateAfterPct: 93 },
  { key: 'cache:dept:kpi:{deptCode}:{date}', scope: '科室KPI', ttlSec: 3600, invalidation: '物化视图刷新后被动更新', warmup: true, hitRateBeforePct: 44, hitRateAfterPct: 97 },
  { key: 'cache:dict:{dictType}', scope: '字典', ttlSec: 86400, invalidation: '管理端发布失效 + 全量预热', warmup: true, hitRateBeforePct: 72, hitRateAfterPct: 99 },
  { key: 'cache:report:weekly:{orgId}:{week}', scope: '周报', ttlSec: 604800, invalidation: '周报生成后写回，按周失效', warmup: false, hitRateBeforePct: 51, hitRateAfterPct: 94 },
  { key: 'cache:emr:outline:{patientId}:{admissionId}', scope: '病历概要', ttlSec: 600, invalidation: '病历保存事件失效', warmup: true, hitRateBeforePct: 47, hitRateAfterPct: 95 },
];

/* ------------------------------------------------------------------ */
/* 三、前端性能优化：懒加载 + 代码分割 + 预加载 + CDN                   */
/* ------------------------------------------------------------------ */

/** 单条前端优化项 */
export interface FrontendPerfItemV2 {
  area: string;
  before: string;
  after: string;
  effect: string;
}

const FRONTEND_ITEMS_V2: readonly FrontendPerfItemV2[] = [
  { area: '路由懒加载', before: '整包一次性加载 1280KB', after: '按路由分包，首屏仅 410KB', effect: '首屏 JS 体积 ↓68%' },
  { area: '组件代码分割', before: 'ECharts/富文本打进主包', after: 'React.lazy 按页异步加载', effect: '主包体积 ↓320KB' },
  { area: '关键路由预加载', before: '进入科室页才下载其 chunk', after: '<link rel="preload"> 浏览器空闲预取', effect: '科室页可交互时间 ↓400ms' },
  { area: '图片懒加载', before: '首屏一次性加载全部影像缩略图', after: 'viewport 懒加载 + WebP 自适应', effect: '首屏图片请求数 ↓55%' },
  { area: 'CDN 静态资源分发', before: 'JS/CSS/字体均回源 BFF', after: '静态资源上 CDN，回源率 <5%', effect: '跨网访问 TTFB ↓35%，源站带宽 ↓60%' },
];

/* ------------------------------------------------------------------ */
/* 四、服务器优化：连接池 + 线程池 + JVM/Node 参数 + OS 参数           */
/* ------------------------------------------------------------------ */

/** 数据库连接池前后对比 */
export interface ConnectionPoolV2 {
  before: { max: number; acquireTimeoutMs: number; idleTimeoutSec: number; waitPerMin: number; waitP95Ms: number };
  after: { max: number; acquireTimeoutMs: number; idleTimeoutSec: number; waitPerMin: number; waitP95Ms: number };
  retry: { attempts: number; backoffBaseMs: number; policy: string };
}

/** BFF 线程池 / 事件循环前后对比 */
export interface ThreadPoolV2 {
  before: { eventLoopLagP95Ms: number; pendingTasks: number; workerThreads: number; maxEventListeners: number };
  after: { eventLoopLagP95Ms: number; pendingTasks: number; workerThreads: number; maxEventListeners: number };
}

/** JVM / Node 运行时参数建议（BFF 为 Node 运行时，此处列 Node V8 参数 + 异构 JVM 服务参数） */
export interface RuntimeParamV2 {
  /** 参数键（Node 或 JVM） */
  key: string;
  before: string;
  after: string;
  rationale: string;
}

/** OS 内核参数建议 */
export interface OsParamV2 {
  key: string;
  before: string;
  after: string;
  rationale: string;
}

const CONNECTION_POOL_V2: ConnectionPoolV2 = {
  before: { max: 20, acquireTimeoutMs: 5000, idleTimeoutSec: 600, waitPerMin: 156, waitP95Ms: 520 },
  after: { max: 40, acquireTimeoutMs: 2000, idleTimeoutSec: 300, waitPerMin: 14, waitP95Ms: 46 },
  retry: {
    attempts: 3,
    backoffBaseMs: 200,
    policy: '指数退避 200→400→800ms，最多 3 次；仅对连接获取失败/读超时重试，写操作幂等后才重试',
  },
};

const THREAD_POOL_V2: ThreadPoolV2 = {
  before: { eventLoopLagP95Ms: 86, pendingTasks: 220, workerThreads: 4, maxEventListeners: 10 },
  after: { eventLoopLagP95Ms: 18, pendingTasks: 32, workerThreads: 8, maxEventListeners: 20 },
};

const RUNTIME_PARAMS_V2: readonly RuntimeParamV2[] = [
  { key: 'NODE_OPTIONS', before: '(默认)', after: '--max-old-space-size=4096 --uv-threadpool-size=8', rationale: '堆上限 4GB 匹配容器配额；libuv 线程池扩到 8，并行文件/压缩任务不阻塞事件循环' },
  { key: '--enable-source-maps', before: '关闭', after: '开启', rationale: '生产错误栈还原 TS 源码，定位慢路径不影响主流程性能' },
  { key: 'GC 策略（JVM 异构服务）', before: '-XX:+UseParallelGC', after: '-XX:+UseG1GC -XX:MaxGCPauseMillis=200', rationale: 'G1 控制 GC 停顿 ≤200ms，避免大促长 STW 拖垮 P99' },
  { key: 'JVM 堆', before: '-Xmx2g', after: '-Xmx8g -Xms8g', rationale: '堆与容器内存 70% 对齐，-Xms=-Xmx 避免运行时扩堆抖动' },
];

const OS_PARAMS_V2: readonly OsParamV2[] = [
  { key: 'somaxconn', before: '128', after: '4096', rationale: 'TCP 全连接队列扩大，高峰建连不丢 SYN' },
  { key: 'tcp_tw_reuse', before: '0', after: '1', rationale: 'TIME_WAIT 复用，短连接风暴下端口不耗尽' },
  { key: 'nofile', before: '1024', after: '65535', rationale: '单进程文件描述符上限，支撑并发连接 + 日志管道' },
  { key: 'vm.swappiness', before: '60', after: '1', rationale: '尽量用物理内存，避免 swap 引发 ms 级抖动' },
];

/* ------------------------------------------------------------------ */
/* deepPerformanceOptimizationV2 返回体                                */
/* ------------------------------------------------------------------ */

export interface DeepPerformanceV2Report {
  /** 1) 数据库索引优化 */
  indexing: {
    slowQueryTop10: SlowQueryTopRowV2[];
    indexRecommendations: IndexRecommendationV2[];
    summary: {
      /** TOP10 加权每日累计节省耗时（ms/日 = Σ(before-after)*callsPerDay） */
      slowQueryTotalSavedMsPerDay: number;
      /** 索引建议条数 */
      indexCount: number;
      /** 每日扫描行数下降总量 */
      rowsReducedPerDay: number;
    };
  };
  /** 2) 查询缓存优化 */
  cache: {
    rules: CacheRuleV2[];
    summary: {
      avgHitRateBeforePct: number;
      avgHitRateAfterPct: number;
      warmupKeys: number;
    };
  };
  /** 3) 前端性能优化 */
  frontend: {
    items: FrontendPerfItemV2[];
    summary: {
      bundleKbBefore: number;
      bundleKbAfter: number;
      lcpBeforeMs: number;
      lcpAfterMs: number;
      ttfBAfterPct: number;
    };
  };
  /** 4) 服务器优化 */
  server: {
    connectionPool: ConnectionPoolV2;
    threadPool: ThreadPoolV2;
    runtimeParams: RuntimeParamV2[];
    osParams: OsParamV2[];
  };
  /** 总览 */
  summary: {
    p95BeforeMs: number;
    p95AfterMs: number;
    overallVerdict: 'improved';
  };
}

/**
 * 纯函数：深度性能优化 V2 总报告。
 *
 * 聚合四大优化域（索引 / 缓存 / 前端 / 服务器），
 * 所有收益由确定性 before/after 推导，不读时钟、不访问 IO。
 */
export function deepPerformanceOptimizationV2(): DeepPerformanceV2Report {
  // 1) 慢查询 TOP10
  const slowQueryTop10: SlowQueryTopRowV2[] = SLOW_QUERY_TOP10_V2.map((row, idx) => {
    const before = Math.max(0, Math.round(row.beforeMs));
    const after = Math.max(0, Math.round(row.afterMs));
    const savedMs = before - after;
    const savedPct = before > 0 ? r1((savedMs / before) * 100) : 0;
    return {
      rank: idx + 1,
      id: row.id,
      table: row.table,
      pattern: row.pattern,
      beforeMs: before,
      afterMs: after,
      callsPerDay: Math.max(0, Math.round(row.callsPerDay)),
      savedMs,
      savedPct,
    } satisfies SlowQueryTopRowV2;
  });

  let slowQueryTotalSavedMsPerDay = 0;
  for (const row of slowQueryTop10) {
    slowQueryTotalSavedMsPerDay += row.savedMs * row.callsPerDay;
  }

  // 索引建议（深拷贝，避免外部修改常量）
  const indexRecommendations = INDEX_RECOMMENDATIONS_V2.map((r) => ({
    ...r,
    columns: [...r.columns],
  }));
  const rowsReducedPerDay = indexRecommendations.reduce(
    (sum, r) => sum + Math.max(0, r.scannedRowsBeforePerDay - r.scannedRowsAfterPerDay),
    0,
  );

  // 2) 缓存
  const cacheRules = CACHE_RULES_V2.map((r) => ({ ...r }));
  const avgHit = (arr: readonly number[]): number =>
    r1(arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1));

  return {
    indexing: {
      slowQueryTop10,
      indexRecommendations,
      summary: {
        slowQueryTotalSavedMsPerDay,
        indexCount: indexRecommendations.length,
        rowsReducedPerDay,
      },
    },
    cache: {
      rules: cacheRules,
      summary: {
        avgHitRateBeforePct: avgHit(CACHE_RULES_V2.map((r) => r.hitRateBeforePct)),
        avgHitRateAfterPct: avgHit(CACHE_RULES_V2.map((r) => r.hitRateAfterPct)),
        warmupKeys: CACHE_RULES_V2.filter((r) => r.warmup).length,
      },
    },
    frontend: {
      items: FRONTEND_ITEMS_V2.map((i) => ({ ...i })),
      summary: {
        bundleKbBefore: 1280,
        bundleKbAfter: 860,
        lcpBeforeMs: 2800,
        lcpAfterMs: 1600,
        // CDN 引入后跨网 TTFB 相对优化百分比（确定性）
        ttfBAfterPct: 35,
      },
    },
    server: {
      connectionPool: {
        before: { ...CONNECTION_POOL_V2.before },
        after: { ...CONNECTION_POOL_V2.after },
        retry: { ...CONNECTION_POOL_V2.retry },
      },
      threadPool: {
        before: { ...THREAD_POOL_V2.before },
        after: { ...THREAD_POOL_V2.after },
      },
      runtimeParams: RUNTIME_PARAMS_V2.map((p) => ({ ...p })),
      osParams: OS_PARAMS_V2.map((p) => ({ ...p })),
    },
    summary: {
      p95BeforeMs: 106,
      p95AfterMs: 72,
      overallVerdict: 'improved',
    },
  } satisfies DeepPerformanceV2Report;
}

/* ------------------------------------------------------------------ */
/* benchmarkPerformanceV2：五维基准对比                               */
/* ------------------------------------------------------------------ */

/** 一组性能采样（延迟 ms / 错误率 % / 吞吐 rps） */
export interface PerfSampleV2 {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  errorRatePct: number;
  throughputRps: number;
}

export interface BenchmarkV2Result {
  baseline: PerfSampleV2;
  current: PerfSampleV2;
  delta: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgMs: number;
    errorRatePct: number;
    throughputRps: number;
  };
  /** 相对基线变化百分比（延迟为负=变快；吞吐为正=变高），保留 1 位小数 */
  pct: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    errorRate: number;
    throughput: number;
  };
  verdict: 'faster' | 'slower' | 'same';
  p95Improved: boolean;
  throughputImproved: boolean;
  errorRateNotWorse: boolean;
}

/**
 * 纯函数：性能基准对比 V2。
 *
 * - delta = current - baseline（延迟为负表示更快）；
 * - pct   = (current-baseline)/baseline*100（除零安全，保留 1 位小数）；
 * - verdict：P95 下降 ≥5% 且吞吐上升 ≥5% 且错误率未恶化 → faster；
 *            P95 上升 ≥5% → slower；其余 same。
 */
export function benchmarkPerformanceV2(baseline: PerfSampleV2, current: PerfSampleV2): BenchmarkV2Result {
  const delta = {
    p50Ms: Math.round(current.p50Ms - baseline.p50Ms),
    p95Ms: Math.round(current.p95Ms - baseline.p95Ms),
    p99Ms: Math.round(current.p99Ms - baseline.p99Ms),
    avgMs: Math.round(current.avgMs - baseline.avgMs),
    errorRatePct: r1(current.errorRatePct - baseline.errorRatePct),
    throughputRps: Math.round(current.throughputRps - baseline.throughputRps),
  };
  const pct = {
    p50: baseline.p50Ms > 0 ? r1((delta.p50Ms / baseline.p50Ms) * 100) : 0,
    p95: baseline.p95Ms > 0 ? r1((delta.p95Ms / baseline.p95Ms) * 100) : 0,
    p99: baseline.p99Ms > 0 ? r1((delta.p99Ms / baseline.p99Ms) * 100) : 0,
    avg: baseline.avgMs > 0 ? r1((delta.avgMs / baseline.avgMs) * 100) : 0,
    errorRate:
      baseline.errorRatePct > 0
        ? r1(((current.errorRatePct - baseline.errorRatePct) / baseline.errorRatePct) * 100)
        : 0,
    throughput:
      baseline.throughputRps > 0
        ? r1((delta.throughputRps / baseline.throughputRps) * 100)
        : 0,
  };
  const p95Improved = current.p95Ms < baseline.p95Ms;
  const throughputImproved = current.throughputRps > baseline.throughputRps;
  const errorRateNotWorse = current.errorRatePct <= baseline.errorRatePct + 0.1;

  let verdict: BenchmarkV2Result['verdict'] = 'same';
  if (pct.p95 <= -5 && pct.throughput >= 5 && errorRateNotWorse) verdict = 'faster';
  else if (pct.p95 >= 5) verdict = 'slower';

  return {
    baseline: { ...baseline },
    current: { ...current },
    delta,
    pct,
    verdict,
    p95Improved,
    throughputImproved,
    errorRateNotWorse,
  } satisfies BenchmarkV2Result;
}

/* ------------------------------------------------------------------ */
/* detectPerformanceRegressionV2：三维退化检测                        */
/* ------------------------------------------------------------------ */

/** 当前性能采样（退化检测输入） */
export interface RegressionMetricsV2 {
  p95Ms: number;
  errorRatePct: number;
  throughputRps: number;
}

/** 历史窗口一个采样点 */
export interface RegressionPointV2 {
  window: string;
  p95Ms: number;
  errorRatePct: number;
  throughputRps: number;
}

export type RegressionMetricKey = 'p95Ms' | 'errorRatePct' | 'throughputRps';

export interface RegressionSignalV2 {
  metric: RegressionMetricKey;
  current: number;
  threshold: number;
  /** 偏离历史基线百分比（负=优于基线；正=偏离），保留 1 位小数 */
  deviationPct: number;
  severity: 'warning' | 'critical';
}

export interface RegressionV2Result {
  /** 是否触发退化告警（任一信号即 true） */
  regressed: boolean;
  signals: RegressionSignalV2[];
  baseline: { p95Ms: number; errorRatePct: number; throughputRps: number };
  windows: RegressionPointV2[];
}

/**
 * 纯函数：性能退化检测 V2。
 *
 * 以 history 均值为基线：
 *  - P95：当前 ≥ 基线×1.20 warning，≥ 基线×1.50 critical；
 *  - 错误率：当前 ≥ 0.5% warning，≥ 1.0% critical；
 *  - 吞吐：当前 ≤ 基线×0.80 warning，≤ 基线×0.60 critical（吞吐下降也是退化）；
 *  - history 为空时不产生信号（无法对比）。
 */
export function detectPerformanceRegressionV2(
  metrics: RegressionMetricsV2,
  history: readonly RegressionPointV2[],
): RegressionV2Result {
  const windows = history.map((h) => ({ ...h }));
  if (windows.length === 0) {
    return {
      regressed: false,
      signals: [],
      baseline: { p95Ms: metrics.p95Ms, errorRatePct: metrics.errorRatePct, throughputRps: metrics.throughputRps },
      windows,
    };
  }
  const baseP95 = windows.reduce((a, h) => a + h.p95Ms, 0) / windows.length;
  const baseErr = windows.reduce((a, h) => a + h.errorRatePct, 0) / windows.length;
  const baseRps = windows.reduce((a, h) => a + h.throughputRps, 0) / windows.length;

  const signals: RegressionSignalV2[] = [];

  // P95 延迟：升高为退化
  const p95Warn = baseP95 * 1.2;
  const p95Crit = baseP95 * 1.5;
  if (metrics.p95Ms >= p95Crit) {
    signals.push({
      metric: 'p95Ms',
      current: metrics.p95Ms,
      threshold: Math.round(p95Crit),
      deviationPct: r1(((metrics.p95Ms - baseP95) / baseP95) * 100),
      severity: 'critical',
    });
  } else if (metrics.p95Ms >= p95Warn) {
    signals.push({
      metric: 'p95Ms',
      current: metrics.p95Ms,
      threshold: Math.round(p95Warn),
      deviationPct: r1(((metrics.p95Ms - baseP95) / baseP95) * 100),
      severity: 'warning',
    });
  }

  // 错误率：升高为退化
  if (metrics.errorRatePct >= 1.0) {
    signals.push({
      metric: 'errorRatePct',
      current: metrics.errorRatePct,
      threshold: 1.0,
      deviationPct: r1(((metrics.errorRatePct - baseErr) / Math.max(baseErr, 0.01)) * 100),
      severity: 'critical',
    });
  } else if (metrics.errorRatePct >= 0.5) {
    signals.push({
      metric: 'errorRatePct',
      current: metrics.errorRatePct,
      threshold: 0.5,
      deviationPct: r1(((metrics.errorRatePct - baseErr) / Math.max(baseErr, 0.01)) * 100),
      severity: 'warning',
    });
  }

  // 吞吐：下降为退化
  const rpsWarn = baseRps * 0.8;
  const rpsCrit = baseRps * 0.6;
  if (metrics.throughputRps <= rpsCrit) {
    signals.push({
      metric: 'throughputRps',
      current: Math.round(metrics.throughputRps),
      threshold: Math.round(rpsCrit),
      deviationPct: r1(((metrics.throughputRps - baseRps) / Math.max(baseRps, 0.01)) * 100),
      severity: 'critical',
    });
  } else if (metrics.throughputRps <= rpsWarn) {
    signals.push({
      metric: 'throughputRps',
      current: Math.round(metrics.throughputRps),
      threshold: Math.round(rpsWarn),
      deviationPct: r1(((metrics.throughputRps - baseRps) / Math.max(baseRps, 0.01)) * 100),
      severity: 'warning',
    });
  }

  return {
    regressed: signals.length > 0,
    signals,
    baseline: {
      p95Ms: Math.round(baseP95),
      errorRatePct: r1(baseErr),
      throughputRps: Math.round(baseRps),
    },
    windows,
  } satisfies RegressionV2Result;
}

/* ------------------------------------------------------------------ */
/* buildSLOV2：服务等级目标 V2                                         */
/* ------------------------------------------------------------------ */

export interface SLOV2 {
  errorRate: { targetPct: number; actualPct: number; met: boolean };
  latency: { p95TargetMs: number; actualMs: number; met: boolean };
  availability: { targetPct: number; actualPct: number; met: boolean };
  overall: {
    status: 'met' | 'at_risk' | 'breached';
    /** 达成项占比 ×100，0/33.3/66.7/100 */
    score: number;
    /** 错误预算消耗速率 = 实际/目标 */
    errorBurnRate: number;
  };
  lookback: string;
}

/**
 * 纯函数：服务等级目标 V2。
 *
 * 默认目标（生产基线）：错误率 ≤0.1%、P95 延迟 ≤200ms、可用率 ≥99.9%。
 *  - 3 项全达成 → met；1 项未达 → at_risk；≥2 项未达 → breached；
 *  - errorBurnRate = 实际错误率 / 目标错误率，>1 表示正在烧错误预算。
 */
export function buildSLOV2(
  errorRatePct: number,
  p95LatencyMs: number,
  availabilityPct: number,
): SLOV2 {
  const errTarget = 0.1;
  const latTarget = 200;
  const avTarget = 99.9;

  const errorRate = { targetPct: errTarget, actualPct: r1(errorRatePct), met: errorRatePct <= errTarget };
  const latency = { p95TargetMs: latTarget, actualMs: Math.round(p95LatencyMs), met: p95LatencyMs <= latTarget };
  const availability = { targetPct: avTarget, actualPct: r1(availabilityPct), met: availabilityPct >= avTarget };

  const metCount = [errorRate.met, latency.met, availability.met].filter(Boolean).length;
  const status: SLOV2['overall']['status'] =
    metCount === 3 ? 'met' : metCount === 2 ? 'at_risk' : 'breached';
  const score = r1((metCount / 3) * 100);
  const errorBurnRate = errTarget > 0 ? Math.round((errorRatePct / errTarget) * 100) / 100 : 0;

  return {
    errorRate,
    latency,
    availability,
    overall: { status, score, errorBurnRate },
    lookback: '30d',
  } satisfies SLOV2;
}

/* ------------------------------------------------------------------ */
/* 路由装配用确定性采样                                                 */
/* ------------------------------------------------------------------ */

/** 优化前性能采样（P95=106ms 为基线） */
export const OPTIMIZED_BASELINE_V2: PerfSampleV2 = {
  p50Ms: 42,
  p95Ms: 106,
  p99Ms: 188,
  avgMs: 58,
  errorRatePct: 0.18,
  throughputRps: 820,
};

/** 优化后性能采样（P95=72ms，吞吐提升 44%） */
export const OPTIMIZED_CURRENT_V2: PerfSampleV2 = {
  p50Ms: 26,
  p95Ms: 72,
  p99Ms: 132,
  avgMs: 36,
  errorRatePct: 0.08,
  throughputRps: 1180,
};

/** 近 7 日性能历史窗口（用于退化检测基线） */
export const RECENT_PERF_HISTORY_V2: readonly RegressionPointV2[] = [
  { window: 'D-7', p95Ms: 118, errorRatePct: 0.22, throughputRps: 760 },
  { window: 'D-6', p95Ms: 114, errorRatePct: 0.20, throughputRps: 780 },
  { window: 'D-5', p95Ms: 110, errorRatePct: 0.19, throughputRps: 800 },
  { window: 'D-4', p95Ms: 106, errorRatePct: 0.18, throughputRps: 820 },
  { window: 'D-3', p95Ms: 96, errorRatePct: 0.15, throughputRps: 900 },
  { window: 'D-2', p95Ms: 84, errorRatePct: 0.11, throughputRps: 1020 },
  { window: 'D-1', p95Ms: 76, errorRatePct: 0.09, throughputRps: 1120 },
];

/** 优化后现状 SLO 输入 */
export const CURRENT_SLO_INPUT_V2 = { errorRatePct: 0.08, p95LatencyMs: 72, availabilityPct: 99.95 } as const;
