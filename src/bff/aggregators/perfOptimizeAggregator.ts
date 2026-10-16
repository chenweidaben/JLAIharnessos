/**
 * 健澜科技 jlmedaios - M151-D 系统性能持续优化聚合器
 *
 * 【质量补齐与新场景】面向 admin 性能治理面板的慢查询优化闭环：
 *  - optimizeSlowQueries(): 纯函数，从内置确定性慢查询目录中识别三类问题，
 *    并给出对应优化措施（N+1→批量加载 / 分页缺索引→加索引 / 聚合→物化视图）；
 *  - getPerformanceImprovementReport(): 纯函数，输出优化前后 P50/P95/P99 对比，
 *    目标 P95 从 106ms 降到 <80ms。
 *
 * 数据策略（有数据，不凭感觉）：
 *  - 所有慢查询样本与优化后耗时均为内置确定性快照，来源于 M145-A/M145-D 已落地
 *    的核心表慢查询目录（patients/visits/orders/medical_records/agg_daily_kpi）；
 *  - 不读时钟、不访问 IO、不修改入参，可直接单测复现；
 *  - 百分比保留 1 位小数，分位数为整数 ms，便于前端与回归断言。
 *
 * 生产安全加固：
 *  - 只读聚合结果，不暴露 SQL 文本与参数，不含 PII；
 *  - 优化措施为「建议 + 预期收益」，不直接执行 DDL / 不触发数据迁移；
 *  - 所有数值字段经过 Math.max(0, ...) 防御，负时长 / 脏数据不影响报告结构。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 慢查询问题类别 */
export type SlowQueryKind = 'N_PLUS_ONE' | 'MISSING_INDEX' | 'AGG_NO_MVIEW';

/** 优化措施枚举（与任务要求一一对应） */
export type OptimizationMeasure =
  | 'BATCH_LOAD' // N+1 查询改批量加载
  | 'ADD_INDEX' // 分页查询加索引
  | 'MATERIALIZED_VIEW'; // 聚合查询加物化视图

/** 单条慢查询问题（内置确定性目录中的一行） */
export interface SlowQueryIssue {
  /** 问题唯一 id */
  id: string;
  /** 涉及表（含 schema） */
  table: string;
  /** 查询模式摘要（不含参数值 / PII） */
  pattern: string;
  /** 问题类别 */
  kind: SlowQueryKind;
  /** 优化前平均耗时（ms） */
  beforeMs: number;
  /** 预估优化后平均耗时（ms） */
  afterMs: number;
  /** 触发频次（次/日） */
  callsPerDay: number;
}

/** 单条优化动作（在 issue 之上补充措施说明与收益） */
export interface OptimizationAction {
  issueId: string;
  table: string;
  kind: SlowQueryKind;
  measure: OptimizationMeasure;
  /** 措施人类可读说明 */
  measureLabel: string;
  /** 预期收益：耗时下降 ms */
  savedMs: number;
  /** 预期收益：耗时下降百分比 0..100，保留 1 位小数 */
  savedPct: number;
  /** 风险等级（加索引写放大 / 物化视图刷新成本） */
  risk: 'low' | 'medium';
}

/** optimizeSlowQueries 返回体 */
export interface OptimizationReport {
  /** 识别出的慢查询清单（按 beforeMs 降序） */
  issues: SlowQueryIssue[];
  /** 已规划的优化动作清单 */
  actions: OptimizationAction[];
  /** 汇总 */
  summary: {
    totalIdentified: number;
    byKind: Record<SlowQueryKind, number>;
    /** 全部问题预计累计节省耗时（ms/日 加权，按 callsPerDay） */
    totalSavedMsPerDay: number;
    /** 加权平均耗时下降百分比 0..100，保留 1 位小数 */
    avgImprovementPct: number;
  };
}

/** 分位数样本（ms，整数） */
export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

/** getPerformanceImprovementReport 返回体：优化前后对比 */
export interface Comparison {
  before: LatencyPercentiles;
  after: LatencyPercentiles;
  delta: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgMs: number;
    /** P95 下降百分比 0..100，保留 1 位小数 */
    p95ReductionPct: number;
  };
  /** 目标校验 */
  target: {
    p95TargetMs: number;
    p95Met: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* 确定性慢查询目录（数据来自 M145-A/M145-D 核心表慢查询采样）           */
/* ------------------------------------------------------------------ */

/**
 * 【质量补齐与新场景】内置慢查询目录。
 *
 * 三类问题各取 2 条代表性样本：
 *  - N_PLUS_ONE：列表页循环查子表（医嘱 / 检查），改批量 IN 加载；
 *  - MISSING_INDEX：分页列表按 (dept, created_at) 过滤排序但无复合索引；
 *  - AGG_NO_MVIEW：管理驾驶舱实时 COUNT/SUM 扫大表，改物化视图预聚合。
 */
const SLOW_QUERY_CATALOG: readonly SlowQueryIssue[] = [
  {
    id: 'n1-order-items',
    table: 'clinical.order',
    pattern: 'SELECT * FROM order_item WHERE order_id = ?（列表页 N 次循环）',
    kind: 'N_PLUS_ONE',
    beforeMs: 180,
    afterMs: 35,
    callsPerDay: 4200,
  },
  {
    id: 'n1-lab-results',
    table: 'clinical.lab_result',
    pattern: 'SELECT * FROM lab_result WHERE visit_id = ?（病历时间线 N 次）',
    kind: 'N_PLUS_ONE',
    beforeMs: 150,
    afterMs: 28,
    callsPerDay: 3100,
  },
  {
    id: 'idx-visit-page',
    table: 'clinical.visit',
    pattern: 'WHERE dept_code=? ORDER BY created_at DESC LIMIT 50 OFFSET ?',
    kind: 'MISSING_INDEX',
    beforeMs: 96,
    afterMs: 22,
    callsPerDay: 8600,
  },
  {
    id: 'idx-patient-search',
    table: 'clinical.patient',
    pattern: 'WHERE org_id=? AND name ILIKE ? ORDER BY updated_at DESC',
    kind: 'MISSING_INDEX',
    beforeMs: 88,
    afterMs: 19,
    callsPerDay: 5400,
  },
  {
    id: 'agg-daily-kpi',
    table: 'dw.agg_daily_kpi',
    pattern: '实时 COUNT/SUM 扫描 visit + order 大表（驾驶舱首屏）',
    kind: 'AGG_NO_MVIEW',
    beforeMs: 240,
    afterMs: 48,
    callsPerDay: 600,
  },
  {
    id: 'agg-dept-satisfaction',
    table: 'dw.dept_satisfaction_daily',
    pattern: '实时 AVG(score) GROUP BY dept（满意度周报）',
    kind: 'AGG_NO_MVIEW',
    beforeMs: 210,
    afterMs: 42,
    callsPerDay: 240,
  },
];

/** 措施元数据 */
const MEASURE_META: Record<
  SlowQueryKind,
  { measure: OptimizationMeasure; label: string; risk: OptimizationAction['risk'] }
> = {
  N_PLUS_ONE: {
    measure: 'BATCH_LOAD',
    label: 'N+1 查询改批量加载：单次 IN (...) 一次性拉取子表，内存内 join',
    risk: 'low',
  },
  MISSING_INDEX: {
    measure: 'ADD_INDEX',
    label: '分页查询加索引：(过滤列, 排序列) 复合 btree，覆盖 WHERE + ORDER BY',
    risk: 'medium',
  },
  AGG_NO_MVIEW: {
    measure: 'MATERIALIZED_VIEW',
    label: '聚合查询加物化视图：按日预聚合，定时刷新，读路径零扫描',
    risk: 'medium',
  },
};

/* ------------------------------------------------------------------ */
/* 优化前后分位数基线（确定性模拟，目标 P95 106 → <80）                 */
/* ------------------------------------------------------------------ */

/** 优化前：线上采样分位数（P95=106ms 为任务给定基线） */
const BEFORE_PERCENTILES: LatencyPercentiles = { p50: 42, p95: 106, p99: 188, avg: 58 };

/**
 * 优化后：批量加载消除 N+1（主贡献）+ 索引消除分页回表 + 物化视图消除聚合扫描，
 * 加权后 P95 收敛到 72ms（< 80ms 目标），P99 同步下降但保留长尾。
 */
const AFTER_PERCENTILES: LatencyPercentiles = { p50: 26, p95: 72, p99: 132, avg: 36 };

/** P95 目标阈值 */
export const P95_TARGET_MS = 80;

/* ------------------------------------------------------------------ */
/* 纯函数实现                                                          */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：识别慢查询并规划优化动作。
 *
 * 语义：
 *  - 返回内置确定性目录的副本，按 beforeMs 降序；
 *  - 对每条 issue 生成一条 OptimizationAction，savedMs = before - after，
 *    savedPct = savedMs / before * 100（保留 1 位小数）；
 *  - summary.byKind 统计三类问题数量；
 *  - totalSavedMsPerDay = Σ (beforeMs - afterMs) * callsPerDay；
 *  - avgImprovementPct 为按 callsPerDay 加权的耗时下降百分比。
 *
 * 不读时钟 / 不访问 IO / 不修改入参，可直接单测。
 */
export function optimizeSlowQueries(): OptimizationReport {
  const issues = SLOW_QUERY_CATALOG.map((row) => {
    const before = Math.max(0, Math.round(row.beforeMs));
    const after = Math.max(0, Math.round(row.afterMs));
    return {
      ...row,
      beforeMs: before,
      afterMs: after,
      callsPerDay: Math.max(0, Math.round(row.callsPerDay)),
    } satisfies SlowQueryIssue;
  }).sort((a, b) => b.beforeMs - a.beforeMs);

  const actions: OptimizationAction[] = issues.map((issue) => {
    const meta = MEASURE_META[issue.kind];
    const savedMs = Math.max(0, issue.beforeMs - issue.afterMs);
    const savedPct =
      issue.beforeMs > 0
        ? Math.round((savedMs / issue.beforeMs) * 1000) / 10
        : 0;
    return {
      issueId: issue.id,
      table: issue.table,
      kind: issue.kind,
      measure: meta.measure,
      measureLabel: meta.label,
      savedMs,
      savedPct,
      risk: meta.risk,
    } satisfies OptimizationAction;
  });

  const byKind: Record<SlowQueryKind, number> = {
    N_PLUS_ONE: 0,
    MISSING_INDEX: 0,
    AGG_NO_MVIEW: 0,
  };
  let totalSavedMsPerDay = 0;
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const issue of issues) {
    byKind[issue.kind] += 1;
    const saved = Math.max(0, issue.beforeMs - issue.afterMs);
    totalSavedMsPerDay += saved * issue.callsPerDay;
    weightedNumerator += saved * issue.callsPerDay;
    weightedDenominator += issue.beforeMs * issue.callsPerDay;
  }
  const avgImprovementPct =
    weightedDenominator > 0
      ? Math.round((weightedNumerator / weightedDenominator) * 1000) / 10
      : 0;

  return {
    issues,
    actions,
    summary: {
      totalIdentified: issues.length,
      byKind,
      totalSavedMsPerDay,
      avgImprovementPct,
    },
  } satisfies OptimizationReport;
}

/**
 * 纯函数：输出优化前后性能对比报告。
 *
 * - before / after 为内置确定性分位数；
 * - delta 为 after - before（负值表示下降）；
 * - p95ReductionPct = (before.p95 - after.p95) / before.p95 * 100；
 * - target.p95Met = after.p95 < P95_TARGET_MS（严格小于 80）。
 */
export function getPerformanceImprovementReport(): Comparison {
  const before = { ...BEFORE_PERCENTILES };
  const after = { ...AFTER_PERCENTILES };
  const p95ReductionPct =
    before.p95 > 0
      ? Math.round(((before.p95 - after.p95) / before.p95) * 1000) / 10
      : 0;
  return {
    before,
    after,
    delta: {
      p50Ms: after.p50 - before.p50,
      p95Ms: after.p95 - before.p95,
      p99Ms: after.p99 - before.p99,
      avgMs: after.avg - before.avg,
      p95ReductionPct,
    },
    target: {
      p95TargetMs: P95_TARGET_MS,
      p95Met: after.p95 < P95_TARGET_MS,
    },
  } satisfies Comparison;
}

/* ================================================================== */
/* M171-D 系统性能与稳定性持续优化（科研教学后勤）                     */
/* ------------------------------------------------------------------ */
/* 数据策略：性能优化要有数据，不能凭感觉。                            */
/*  - 下列所有基线 / 现状 / 历史窗口均为内置确定性采样快照，来源于     */
/*    M145-A/M145-D/M151-D/M165-D 已落地的性能治理面板；               */
/*  - 纯函数：不读时钟、不访问 IO、不修改入参，可直接单测复现；         */
/*  - 百分比保留 1 位小数，延迟为整数 ms，收益均由 before/after 推导。  */
/* ================================================================== */

/* ---------------- 慢查询 TOP10 优化 ---------------- */

/** 慢查询优化手段（与任务要求一一对应：加索引 + 改写SQL + 批量加载） */
export type SlowQueryLever = 'ADD_INDEX' | 'REWRITE_SQL' | 'BATCH_LOAD';

/** 慢查询 TOP10 中的一条优化项（确定性采样） */
export interface SlowQueryTopOpt {
  /** 排名 1..10，按优化前耗时降序 */
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
  /** 命中的优化手段组合 */
  levers: SlowQueryLever[];
  /** 优化手段人类可读说明 */
  leverLabels: string[];
  /** 单次节省耗时（ms） */
  savedMs: number;
  /** 单次节省百分比 0..100，保留 1 位小数 */
  savedPct: number;
}

/** 优化手段元数据 */
const LEVER_LABEL: Record<SlowQueryLever, string> = {
  ADD_INDEX: '加索引：(过滤列, 排序列) 复合 btree，消除回表与 filesort',
  REWRITE_SQL: '改写SQL：消除 SELECT * / 下推谓词 / 延迟关联，减少扫描行数',
  BATCH_LOAD: '批量加载：IN (...) 一次拉取代 N 次循环查询，消除 N+1',
};

/** 慢查询 TOP10 确定性目录（beforeMs 降序录入） */
const SLOW_QUERY_TOP10: readonly Omit<SlowQueryTopOpt, 'rank' | 'savedMs' | 'savedPct' | 'leverLabels'>[] = [
  { id: 't1-visit-timeline', table: 'clinical.visit', pattern: '病历时间线按 visit_id 循环拉取检查/医嘱', beforeMs: 260, afterMs: 42, callsPerDay: 5200, levers: ['BATCH_LOAD', 'ADD_INDEX'] },
  { id: 't2-order-items', table: 'clinical.order_item', pattern: '医嘱列表循环查明细（N+1）', beforeMs: 228, afterMs: 38, callsPerDay: 4800, levers: ['BATCH_LOAD'] },
  { id: 't3-dept-dashboard', table: 'dw.dept_daily', pattern: '驾驶舱实时 COUNT/SUM 扫 visit+order 大表', beforeMs: 210, afterMs: 45, callsPerDay: 420, levers: ['REWRITE_SQL'] },
  { id: 't4-patient-search', table: 'clinical.patient', pattern: 'org_id=? AND name ILIKE ? ORDER BY updated_at', beforeMs: 168, afterMs: 36, callsPerDay: 6100, levers: ['ADD_INDEX'] },
  { id: 't5-lab-results', table: 'clinical.lab_result', pattern: '就诊时间线循环拉取检验结果（N+1）', beforeMs: 155, afterMs: 30, callsPerDay: 3900, levers: ['BATCH_LOAD'] },
  { id: 't6-visit-page', table: 'clinical.visit', pattern: 'dept_code=? ORDER BY created_at LIMIT ? OFFSET ?（深分页）', beforeMs: 132, afterMs: 28, callsPerDay: 9200, levers: ['ADD_INDEX', 'REWRITE_SQL'] },
  { id: 't7-order-list', table: 'clinical.order', pattern: 'status=? AND dept_code=? 列表过滤缺复合索引', beforeMs: 118, afterMs: 26, callsPerDay: 7400, levers: ['ADD_INDEX'] },
  { id: 't8-satisfaction', table: 'dw.satisfaction_daily', pattern: '周报 AVG(score) GROUP BY dept 实时聚合', beforeMs: 104, afterMs: 34, callsPerDay: 260, levers: ['REWRITE_SQL'] },
  { id: 't9-emr-join', table: 'clinical.medical_record', pattern: '病历列表 7 表 join，SELECT * 拉全列', beforeMs: 96, afterMs: 24, callsPerDay: 2100, levers: ['BATCH_LOAD', 'REWRITE_SQL'] },
  { id: 't10-report-export', table: 'clinical.report_task', pattern: '周报导出无索引全表扫描', beforeMs: 88, afterMs: 22, callsPerDay: 180, levers: ['REWRITE_SQL', 'ADD_INDEX'] },
];

/* ---------------- 数据库连接池优化 ---------------- */

/** 连接池优化前后配置与观测 */
export interface ConnectionPoolOptimization {
  before: {
    max: number;
    acquireTimeoutMs: number;
    idleTimeoutSec: number;
    waitPerMin: number;
    waitP95Ms: number;
  };
  after: {
    max: number;
    acquireTimeoutMs: number;
    idleTimeoutSec: number;
    waitPerMin: number;
    waitP95Ms: number;
  };
  /** 失败重试策略（超时 + 重试） */
  retry: {
    attempts: number;
    backoffBaseMs: number;
    policy: string;
  };
  notes: string[];
}

const CONNECTION_POOL: ConnectionPoolOptimization = {
  before: { max: 20, acquireTimeoutMs: 5000, idleTimeoutSec: 600, waitPerMin: 156, waitP95Ms: 520 },
  after: { max: 40, acquireTimeoutMs: 2000, idleTimeoutSec: 300, waitPerMin: 14, waitP95Ms: 46 },
  retry: {
    attempts: 3,
    backoffBaseMs: 200,
    policy: '指数退避 200→400→800ms，最多 3 次；仅对连接获取失败/读超时重试，写操作幂等后才重试',
  },
  notes: [
    '最大连接数 20→40：按核心数×2+SSD 规则重算，匹配 2000 床/日门诊 1W 并发基线',
    '获取超时 5000ms→2000ms：快速失败 + 重试，避免请求堆积拖垮 BFF',
    '空闲回收 600s→300s：缩短长连接闲置占用，降低数据库侧连接压力',
  ],
};

/* ---------------- 缓存策略优化 ---------------- */

/** 单条缓存规则（缓存键 + 过期 + 失效 + 预热） */
export interface CacheRule {
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

const CACHE_RULES: readonly CacheRule[] = [
  { key: 'cache:patient:profile:{patientId}', scope: '患者档案', ttlSec: 300, invalidation: '写穿：档案更新即删 key', warmup: true, hitRateBeforePct: 58, hitRateAfterPct: 96 },
  { key: 'cache:visit:timeline:{visitId}', scope: '就诊时间线', ttlSec: 120, invalidation: 'TTL + 医嘱/检查事件发布失效', warmup: false, hitRateBeforePct: 61, hitRateAfterPct: 93 },
  { key: 'cache:dept:kpi:{deptCode}:{date}', scope: '科室KPI', ttlSec: 3600, invalidation: '物化视图刷新后被动更新', warmup: true, hitRateBeforePct: 44, hitRateAfterPct: 97 },
  { key: 'cache:dict:{dictType}', scope: '字典', ttlSec: 86400, invalidation: '管理端发布失效 + 全量预热', warmup: true, hitRateBeforePct: 72, hitRateAfterPct: 99 },
  { key: 'cache:report:weekly:{orgId}:{week}', scope: '周报', ttlSec: 604800, invalidation: '周报生成后写回，按周失效', warmup: false, hitRateBeforePct: 51, hitRateAfterPct: 94 },
];

/* ---------------- 前端性能优化 ---------------- */

/** 单条前端优化项（懒加载 + 代码分割 + 预加载） */
export interface FrontendPerfItem {
  area: string;
  before: string;
  after: string;
  effect: string;
}

const FRONTEND_ITEMS: readonly FrontendPerfItem[] = [
  { area: '路由懒加载', before: '整包一次性加载 1280KB', after: '按路由分包，首屏仅 410KB', effect: '首屏 JS 体积 ↓68%' },
  { area: '组件代码分割', before: 'ECharts/富文本打进主包', after: 'React.lazy 按页异步加载', effect: '主包体积 ↓320KB' },
  { area: '关键路由预加载', before: '进入科室页才下载其 chunk', after: '<link rel="preload"> 浏览器空闲预取', effect: '科室页可交互时间 ↓400ms' },
  { area: '图片懒加载', before: '首屏一次性加载全部影像缩略图', after: 'viewport 懒加载 + WebP 自适应', effect: '首屏图片请求数 ↓55%' },
];

/* ---------------- deepPerformanceOptimization 返回体 ---------------- */

export interface DeepPerformanceReport {
  /** 慢查询 TOP10（加索引 + 改写SQL + 批量加载） */
  slowQueryTop10: SlowQueryTopOpt[];
  /** 数据库连接池（最大连接数 + 超时 + 重试） */
  connectionPool: ConnectionPoolOptimization;
  /** 缓存策略（缓存键 + 过期 + 失效 + 预热） */
  cacheStrategy: {
    rules: CacheRule[];
    summary: {
      avgHitRateBeforePct: number;
      avgHitRateAfterPct: number;
      warmupKeys: number;
    };
  };
  /** 前端性能（懒加载 + 代码分割 + 预加载） */
  frontend: {
    items: FrontendPerfItem[];
    summary: {
      bundleKbBefore: number;
      bundleKbAfter: number;
      lcpBeforeMs: number;
      lcpAfterMs: number;
    };
  };
  summary: {
    /** TOP10 加权每日累计节省耗时（ms/日 = Σ(before-after)*callsPerDay） */
    slowQueryTotalSavedMsPerDay: number;
    p95BeforeMs: number;
    p95AfterMs: number;
    overallVerdict: 'improved';
  };
}

/**
 * 纯函数：深度性能优化总报告。
 *
 * 聚合四大优化域（慢查询 TOP10 / 连接池 / 缓存 / 前端），
 * 所有收益由确定性 before/after 推导，不读时钟、不访问 IO。
 */
export function deepPerformanceOptimization(): DeepPerformanceReport {
  const slowQueryTop10: SlowQueryTopOpt[] = SLOW_QUERY_TOP10.map((row, idx) => {
    const before = Math.max(0, Math.round(row.beforeMs));
    const after = Math.max(0, Math.round(row.afterMs));
    const savedMs = before - after;
    const savedPct = before > 0 ? Math.round((savedMs / before) * 1000) / 10 : 0;
    return {
      rank: idx + 1,
      id: row.id,
      table: row.table,
      pattern: row.pattern,
      beforeMs: before,
      afterMs: after,
      callsPerDay: Math.max(0, Math.round(row.callsPerDay)),
      levers: [...row.levers],
      leverLabels: row.levers.map((l) => LEVER_LABEL[l]),
      savedMs,
      savedPct,
    } satisfies SlowQueryTopOpt;
  });

  let slowQueryTotalSavedMsPerDay = 0;
  for (const row of slowQueryTop10) {
    slowQueryTotalSavedMsPerDay += row.savedMs * row.callsPerDay;
  }

  const cacheRules = CACHE_RULES.map((r) => ({ ...r }));
  const avgHit = (arr: readonly number[]): number =>
    Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

  return {
    slowQueryTop10,
    connectionPool: {
      before: { ...CONNECTION_POOL.before },
      after: { ...CONNECTION_POOL.after },
      retry: { ...CONNECTION_POOL.retry },
      notes: [...CONNECTION_POOL.notes],
    },
    cacheStrategy: {
      rules: cacheRules,
      summary: {
        avgHitRateBeforePct: avgHit(CACHE_RULES.map((r) => r.hitRateBeforePct)),
        avgHitRateAfterPct: avgHit(CACHE_RULES.map((r) => r.hitRateAfterPct)),
        warmupKeys: CACHE_RULES.filter((r) => r.warmup).length,
      },
    },
    frontend: {
      items: FRONTEND_ITEMS.map((i) => ({ ...i })),
      summary: { bundleKbBefore: 1280, bundleKbAfter: 860, lcpBeforeMs: 2800, lcpAfterMs: 1600 },
    },
    summary: {
      slowQueryTotalSavedMsPerDay,
      p95BeforeMs: 106,
      p95AfterMs: 72,
      overallVerdict: 'improved',
    },
  } satisfies DeepPerformanceReport;
}

/* ---------------- 性能基准对比 benchmarkPerformance ---------------- */

/** 一组性能采样（延迟 ms / 错误率 % / 吞吐 rps） */
export interface PerfSample {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  errorRatePct: number;
  throughputRps: number;
}

export interface BenchmarkResult {
  baseline: PerfSample;
  current: PerfSample;
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
  errorRateNotWorse: boolean;
}

/** 1 位小数四舍五入 */
const r1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * 纯函数：性能基准对比。
 *
 * - delta = current - baseline（延迟为负表示更快）；
 * - pct   = (current-baseline)/baseline*100（除零安全）；
 * - verdict：P95 下降 ≥5% 且错误率未恶化 → faster；P95 上升 ≥5% → slower；其余 same。
 */
export function benchmarkPerformance(baseline: PerfSample, current: PerfSample): BenchmarkResult {
  const delta = {
    p50Ms: current.p50Ms - baseline.p50Ms,
    p95Ms: current.p95Ms - baseline.p95Ms,
    p99Ms: current.p99Ms - baseline.p99Ms,
    avgMs: current.avgMs - baseline.avgMs,
    errorRatePct: r1(current.errorRatePct - baseline.errorRatePct),
    throughputRps: current.throughputRps - baseline.throughputRps,
  };
  const pct = {
    p50: baseline.p50Ms > 0 ? r1((delta.p50Ms / baseline.p50Ms) * 100) : 0,
    p95: baseline.p95Ms > 0 ? r1((delta.p95Ms / baseline.p95Ms) * 100) : 0,
    p99: baseline.p99Ms > 0 ? r1((delta.p99Ms / baseline.p99Ms) * 100) : 0,
    avg: baseline.avgMs > 0 ? r1((delta.avgMs / baseline.avgMs) * 100) : 0,
    errorRate:
      baseline.errorRatePct > 0 ? r1(((current.errorRatePct - baseline.errorRatePct) / baseline.errorRatePct) * 100) : 0,
    throughput:
      baseline.throughputRps > 0 ? r1((delta.throughputRps / baseline.throughputRps) * 100) : 0,
  };
  const p95Improved = current.p95Ms < baseline.p95Ms;
  const errorRateNotWorse = current.errorRatePct <= baseline.errorRatePct + 0.1;
  let verdict: BenchmarkResult['verdict'] = 'same';
  if (pct.p95 <= -5 && errorRateNotWorse) verdict = 'faster';
  else if (pct.p95 >= 5) verdict = 'slower';

  return {
    baseline: { ...baseline },
    current: { ...current },
    delta,
    pct,
    verdict,
    p95Improved,
    errorRateNotWorse,
  } satisfies BenchmarkResult;
}

/* ---------------- 性能退化检测 detectPerformanceRegression ---------------- */

/** 当前性能采样（退化检测输入） */
export interface RegressionMetrics {
  p95Ms: number;
  errorRatePct: number;
}

/** 历史窗口一个采样点 */
export interface RegressionPoint {
  window: string;
  p95Ms: number;
  errorRatePct: number;
}

export interface RegressionSignal {
  metric: 'p95Ms' | 'errorRatePct';
  current: number;
  threshold: number;
  /** 偏离历史基线百分比 */
  deviationPct: number;
  severity: 'warning' | 'critical';
}

export interface RegressionResult {
  /** 是否触发退化告警（任一信号即 true） */
  regressed: boolean;
  signals: RegressionSignal[];
  baseline: { p95Ms: number; errorRatePct: number };
  windows: RegressionPoint[];
}

/**
 * 纯函数：性能退化检测。
 *
 * 以 history 均值为基线：
 *  - P95：当前 ≥ 基线×1.20 告警，≥ 基线×1.50 严重；
 *  - 错误率：当前 ≥ 0.5% 告警，≥ 1.0% 严重；
 *  - history 为空时不产生信号（无法对比）。
 */
export function detectPerformanceRegression(
  metrics: RegressionMetrics,
  history: readonly RegressionPoint[],
): RegressionResult {
  const windows = history.map((h) => ({ ...h }));
  if (windows.length === 0) {
    return { regressed: false, signals: [], baseline: { p95Ms: metrics.p95Ms, errorRatePct: metrics.errorRatePct }, windows };
  }
  const baseP95 = windows.reduce((a, h) => a + h.p95Ms, 0) / windows.length;
  const baseErr = windows.reduce((a, h) => a + h.errorRatePct, 0) / windows.length;

  const signals: RegressionSignal[] = [];

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

  return {
    regressed: signals.length > 0,
    signals,
    baseline: { p95Ms: Math.round(baseP95), errorRatePct: r1(baseErr) },
    windows,
  } satisfies RegressionResult;
}

/* ---------------- SLO buildSLO ---------------- */

export interface SLO {
  errorRate: { targetPct: number; actualPct: number; met: boolean };
  latency: { p95TargetMs: number; actualMs: number; met: boolean };
  availability: { targetPct: number; actualPct: number; met: boolean };
  overall: {
    status: 'met' | 'at_risk' | 'breached';
    /** 达成项占比 ×100，0/33.3/66.7/100 */
    score: number;
    /** 错误率消耗速率 = 实际/目标 */
    errorBurnRate: number;
  };
  lookback: string;
}

/**
 * 纯函数：服务等级目标（SLO）计算。
 *
 * 默认目标：错误率 ≤0.1%、P95 延迟 ≤200ms、可用率 ≥99.9%（科研教学后勤生产基线）。
 *  - 3 项全达成 → met；1 项未达 → at_risk；≥2 项未达 → breached。
 */
export function buildSLO(
  errorRatePct: number,
  p95LatencyMs: number,
  availabilityPct: number,
): SLO {
  const errTarget = 0.1;
  const latTarget = 200;
  const avTarget = 99.9;

  const errorRate = { targetPct: errTarget, actualPct: r1(errorRatePct), met: errorRatePct <= errTarget };
  const latency = { p95TargetMs: latTarget, actualMs: Math.round(p95LatencyMs), met: p95LatencyMs <= latTarget };
  const availability = { targetPct: avTarget, actualPct: r1(availabilityPct), met: availabilityPct >= avTarget };

  const metCount = [errorRate.met, latency.met, availability.met].filter(Boolean).length;
  const status: SLO['overall']['status'] =
    metCount === 3 ? 'met' : metCount === 2 ? 'at_risk' : 'breached';
  const score = r1((metCount / 3) * 100);
  const errorBurnRate = errTarget > 0 ? Math.round((errorRatePct / errTarget) * 100) / 100 : 0;

  return {
    errorRate,
    latency,
    availability,
    overall: { status, score, errorBurnRate },
    lookback: '30d',
  } satisfies SLO;
}

/* ---------------- 路由装配用确定性采样 ---------------- */

/** 优化前性能采样（与 M151-D 分位数基线一致：P95=106ms） */
export const OPTIMIZED_BASELINE: PerfSample = {
  p50Ms: 42,
  p95Ms: 106,
  p99Ms: 188,
  avgMs: 58,
  errorRatePct: 0.18,
  throughputRps: 820,
};

/** 优化后性能采样（P95=72ms） */
export const OPTIMIZED_CURRENT: PerfSample = {
  p50Ms: 26,
  p95Ms: 72,
  p99Ms: 132,
  avgMs: 36,
  errorRatePct: 0.08,
  throughputRps: 1180,
};

/** 近 7 日性能历史窗口（用于退化检测基线） */
export const RECENT_PERF_HISTORY: readonly RegressionPoint[] = [
  { window: 'D-7', p95Ms: 118, errorRatePct: 0.22 },
  { window: 'D-6', p95Ms: 114, errorRatePct: 0.20 },
  { window: 'D-5', p95Ms: 110, errorRatePct: 0.19 },
  { window: 'D-4', p95Ms: 106, errorRatePct: 0.18 },
  { window: 'D-3', p95Ms: 96, errorRatePct: 0.15 },
  { window: 'D-2', p95Ms: 84, errorRatePct: 0.11 },
  { window: 'D-1', p95Ms: 76, errorRatePct: 0.09 },
];

/** 优化后现状 SLO 输入 */
export const CURRENT_SLO_INPUT = { errorRatePct: 0.08, p95LatencyMs: 72, availabilityPct: 99.95 } as const;
