/**
 * 健澜科技 jlmedaios - 慢查询治理聚合器（M136-B）
 *
 * 【性能优化 · 慢查询治理】面向 admin 性能测试台的慢路由识别与 SQL 静态优化建议。
 *
 * 分层：
 *  - 纯函数：
 *      identifySlowRoutes(benchmarkResults, thresholdMs)
 *          从基准测试结果中筛出 P95 > thresholdMs 的路由，按 P95 降序，
 *          并给出严重度分级与治理动作建议（索引 / 缓存 / N+1）；
 *      optimizeQueryPerformance(sql)
 *          对单条 SQL 做静态规则分析，输出索引、内存缓存、去 N+1、改写等建议，
 *          不连库、不执行 SQL，只做文本模式匹配；
 *  - 进程内有界 TTL 缓存：withQueryCache 对聚合查询做零依赖包装，
 *      命中即返回缓存副本，避免 admin 面板高频轮询重复构造建议数据。
 *
 * 生产安全加固：
 *  - 缓存有界（MAX_CACHE_KEYS），键爆炸 / 慢查询风暴下内存不无限增长；
 *  - TTL 用可注入 nowMs 时钟计算，默认 Date.now()，单测可确定性推进时间；
 *  - identifySlowRoutes 对空数组、非数值、负时长、脏数据全部防御，返回过滤结果
 *    而非抛错；
 *  - optimizeQueryPerformance 不解析参数值 / PII，仅基于 SQL 文本模板给出建议；
 *  - 缓存只存 BFF 聚合结果，进程重启即清空，仅用于运行时加速。
 *
 * 【持续优化】规则库随真实慢查询样本持续扩充：新增检测器只需在 RULES 数组追加。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 单条路由基准采样点（与 performanceBenchmarkAggregator.BenchmarkResult 结构兼容） */
export interface RouteBenchmarkPoint {
  /** 路由路径，如 /api/v1/admin/xxx */
  route: string;
  /** 展示名（缺省取 route） */
  label?: string;
  /** P95 耗时（ms）——慢路由判定主指标 */
  p95Ms: number;
  /** P50 耗时（ms，缺省 0） */
  p50Ms?: number;
  /** P99 耗时（ms，缺省 0） */
  p99Ms?: number;
  /** 平均耗时（ms，缺省 0） */
  avgMs?: number;
  /** 采样数（缺省 0） */
  samples?: number;
  /** 错误率 0..1（缺省 0） */
  errorRate?: number;
}

/** 治理动作类别 */
export type OptimizationKind = 'index' | 'cache' | 'n+1' | 'rewrite' | 'pagination' | 'filter';

/** 慢路由严重度 */
export type SlowRouteSeverity = 'warn' | 'slow' | 'critical';

/** 单条慢路由（识别结果行） */
export interface SlowRoute {
  route: string;
  label: string;
  p95Ms: number;
  p50Ms: number;
  p99Ms: number;
  avgMs: number;
  samples: number;
  errorRate: number;
  /** 按 P95 分级：<=500 warn / <=1000 slow / 其余 critical */
  severity: SlowRouteSeverity;
  /** 建议治理动作集合（去重） */
  suggestedActions: OptimizationKind[];
}

/** 单条 SQL 优化建议 */
export interface Optimization {
  kind: OptimizationKind;
  /** 短标题 */
  title: string;
  /** 可读建议详情 */
  detail: string;
  /** 识别到的物理表名（无则空串） */
  table: string;
  /** 建议索引列序（无则空数组） */
  columns: string[];
  /** 建议的 DDL / 改写片段（无则空串） */
  sqlSnippet: string;
  /** 预期收益 */
  estimatedImpact: 'low' | 'medium' | 'high';
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 默认慢路由阈值：P95 > 300ms 即纳入治理 */
export const DEFAULT_SLOW_ROUTE_THRESHOLD_MS = 300;

/** 缓存键上限（有界，防止键爆炸导致内存无界增长） */
const MAX_CACHE_KEYS = 1024;

/* ------------------------------------------------------------------ */
/* 纯函数：慢路由识别                                                   */
/* ------------------------------------------------------------------ */

/** 数值防御：非有限数 / 负值 → 0，否则四舍五入为整数 ms */
function safeMs(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

/** P95 → 严重度分级 */
function severityOf(p95Ms: number): SlowRouteSeverity {
  if (p95Ms <= 500) return 'warn';
  if (p95Ms <= 1000) return 'slow';
  return 'critical';
}

/**
 * 由 P95 推导建议治理动作（去重、按固定顺序输出）。
 *  - 所有慢路由都建议加内存缓存（读多写少的 admin / 看板路径）；
 *  - P95 > 500ms 额外建议补索引 + 排查 N+1；
 *  - P95 > 1000ms 再建议改写 / 分页收敛。
 */
function actionsFor(p95Ms: number): OptimizationKind[] {
  const actions: OptimizationKind[] = ['cache'];
  if (p95Ms > 500) {
    actions.push('index', 'n+1');
  }
  if (p95Ms > 1000) {
    actions.push('rewrite', 'pagination');
  }
  return actions;
}

/**
 * 纯函数：从基准结果中筛出 P95 > thresholdMs 的慢路由。
 *
 * 语义：
 *  - benchmarkResults 非数组 / 空 → []；
 *  - thresholdMs <= 0 → []（无意义阈值）；
 *  - 仅保留 p95Ms > thresholdMs（严格大于，与「P95>300ms」口径一致）；
 *  - 结果按 p95Ms 降序，返回副本，不修改入参。
 *
 * 防御：单条 p95Ms 非有限数按 0 计（自然被过滤）；route 非字符串按空串过滤。
 */
export function identifySlowRoutes(
  benchmarkResults: RouteBenchmarkPoint[],
  thresholdMs: number = DEFAULT_SLOW_ROUTE_THRESHOLD_MS,
): SlowRoute[] {
  const list = Array.isArray(benchmarkResults) ? benchmarkResults : [];
  if (list.length === 0 || !(thresholdMs > 0)) return [];

  return list
    .map((row) => {
      const p95 = safeMs(row?.p95Ms);
      const route = typeof row?.route === 'string' ? row.route : '';
      return {
        route,
        label: typeof row?.label === 'string' && row.label.length > 0 ? row.label : route,
        p95Ms: p95,
        p50Ms: safeMs(row?.p50Ms),
        p99Ms: safeMs(row?.p99Ms),
        avgMs: safeMs(row?.avgMs),
        samples: safeMs(row?.samples),
        errorRate:
          typeof row?.errorRate === 'number' && Number.isFinite(row.errorRate)
            ? Math.min(1, Math.max(0, row.errorRate))
            : 0,
        severity: severityOf(p95),
        suggestedActions: actionsFor(p95),
      } satisfies SlowRoute;
    })
    .filter((row) => row.route.length > 0 && row.p95Ms > thresholdMs)
    .sort((a, b) => b.p95Ms - a.p95Ms);
}

/* ------------------------------------------------------------------ */
/* 纯函数：SQL 静态优化建议                                              */
/* ------------------------------------------------------------------ */

/** 从 SQL 文本中抓取主表名（FROM 后第一个标识符，可带 schema.） */
function extractTable(sqlLower: string): string {
  const m = sqlLower.match(/\bfrom\s+([a-z_][a-z0-9_.]*)/i);
  return m ? m[1] : '';
}

/** 抓取 WHERE 等值列（a = ? / a = $1 形态） */
function extractWhereColumns(sqlLower: string): string[] {
  const cols = new Set<string>();
  const re = /\bwhere\b([\s\S]*?)(\border\s+by\b|\bgroup\s+by\b|\blimit\b|$)/i;
  const m = sqlLower.match(re);
  if (!m) return [];
  const body = m[1];
  const colRe = /([a-z_][a-z0-9_]*)\s*(?:=|>=|<=|>|<|in\s*\()/gi;
  let cm: RegExpExecArray | null;
  while ((cm = colRe.exec(body)) !== null) {
    const c = cm[1];
    if (c && !/^(and|or|not|where)$/i.test(c)) cols.add(c);
  }
  return [...cols];
}

/** 抓取 ORDER BY 列 */
function extractOrderColumns(sqlLower: string): string[] {
  const m = sqlLower.match(/\border\s+by\s+([a-z0-9_,\s.]+?)(\blimit\b|$)/i);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().split(/\s+/)[0].replace(/^.*\./, ''))
    .filter(Boolean);
}

/** 单条规则检测器签名：输入归一化 SQL（小写）+ 原始 SQL + 主表，输出建议或 null */
type Rule = (
  sqlLower: string,
  rawSql: string,
  table: string,
) => Optimization | null;

/**
 * 【持续优化】SQL 优化规则库——新增检测器只需在此追加。
 * 当前覆盖：SELECT *、缺 WHERE 全表扫描、前导通配 LIKE、无 LIMIT、
 *           ORDER BY 无配套索引、COUNT(*) 大表、N+1 形态（循环单条 IN 等值）。
 */
const RULES: Rule[] = [
  // 1) SELECT * → 收敛列，减少回表 / 网络传输
  (sqlLower, _raw, table) => {
    if (!/\bselect\s+\*(?=\s|from\b)/i.test(sqlLower)) return null;
    return {
      kind: 'rewrite',
      title: '避免 SELECT *',
      detail: `查询 ${table || '目标表'} 使用了 SELECT *，建议仅显式声明业务所需列，减少回表与网络传输。`,
      table,
      columns: [],
      sqlSnippet: 'SELECT col_a, col_b FROM ... -- 仅保留需要的列',
      estimatedImpact: 'medium',
    };
  },

  // 2) 无 WHERE 的全表扫描 → 补过滤 + 索引
  (sqlLower, _raw, table) => {
    if (!table || /\bwhere\b/i.test(sqlLower)) return null;
    if (!/^\s*select\b/i.test(sqlLower)) return null;
    return {
      kind: 'filter',
      title: '缺失 WHERE 条件（疑似全表扫描）',
      detail: `SELECT 语句作用于 ${table} 但没有 WHERE 过滤条件，数据量增长后将退化为全表扫描，建议按业务时间窗 / 租户列收敛。`,
      table,
      columns: [],
      sqlSnippet: `SELECT ... FROM ${table} WHERE created_at >= ? AND tenant_id = ?`,
      estimatedImpact: 'high',
    };
  },

  // 3) WHERE 存在过滤列 → 建议复合索引（等值列在前，排序列在后）
  (sqlLower, _raw, table) => {
    const whereCols = extractWhereColumns(sqlLower);
    if (!table || whereCols.length === 0) return null;
    const orderCols = extractOrderColumns(sqlLower);
    // 去重并把排序列追加在等值列之后（复合索引列序经验）
    const cols = [...whereCols];
    for (const c of orderCols) if (!cols.includes(c)) cols.push(c);
    if (cols.length === 0) return null;
    return {
      kind: 'index',
      title: '为过滤 / 排序列补复合索引',
      detail: `查询按 ${cols.join(', ')} 过滤与排序，建议建复合索引以走索引扫描而非顺序扫描。`,
      table,
      columns: cols,
      sqlSnippet: `CREATE INDEX CONCURRENTLY idx_${table.replace(/^.*\./, '')}_${cols.join('_')} ON ${table} (${cols.join(', ')});`,
      estimatedImpact: 'high',
    };
  },

  // 4) 前导通配 LIKE '%x%' → 无法走普通 B-Tree
  (sqlLower, _raw, table) => {
    if (!/\blike\s+['"]%[^'"]+%['"]/i.test(sqlLower)) return null;
    return {
      kind: 'index',
      title: '前导通配 LIKE 无法命中 B-Tree 索引',
      detail: `检测到 LIKE '%...%' 前导通配查询，普通索引失效；建议改用 pg_trgm GIN 索引或全文检索。`,
      table,
      columns: [],
      sqlSnippet: `CREATE INDEX CONCURRENTLY ON ${table} USING gin (col gin_trgm_ops);`,
      estimatedImpact: 'medium',
    };
  },

  // 5) SELECT 无 LIMIT → 大结果集分页
  (sqlLower, _raw, table) => {
    if (!/^\s*select\b/i.test(sqlLower)) return null;
    if (/\blimit\b/i.test(sqlLower) || /\bfetch\b/i.test(sqlLower)) return null;
    return {
      kind: 'pagination',
      title: '缺失 LIMIT / 分页',
      detail: `SELECT ${table || ''} 未带 LIMIT，可能一次性拉取全量结果；建议服务端分页（keyset / offset）。`,
      table,
      columns: [],
      sqlSnippet: 'SELECT ... ORDER BY id LIMIT ? OFFSET ?',
      estimatedImpact: 'high',
    };
  },

  // 6) 大表 COUNT(*) → 读路径加内存缓存
  (sqlLower, _raw, table) => {
    if (!/\bcount\s*\(\s*\*\s*\)/i.test(sqlLower)) return null;
    return {
      kind: 'cache',
      title: '大表 COUNT(*) 建议加内存缓存',
      detail: `${table || '目标表'} 的 COUNT(*) 为全表聚合，结果可按 TTL（如 60s）落入 BFF 进程内缓存，避免每次请求重算。`,
      table,
      columns: [],
      sqlSnippet: '-- withQueryCache(key, () => db.count(...), 60_000)',
      estimatedImpact: 'medium',
    };
  },

  // 7) N+1 形态：WHERE 主键 = ? 且外层疑似循环单查（按 IN 列表长度推断）
  (sqlLower, _raw, table) => {
    // 单条按主键等值、且主查询未使用 IN (?, ?...) 批量形态时，提示批量化
    const hasIn = /\b(in)\s*\(\s*\?\s*(,\s*\?\s*)+/i.test(sqlLower);
    if (hasIn) return null;
    const wherePk = /\bwhere\s+(id|[a-z_]+_id)\s*=\s*\?/i.test(sqlLower);
    if (!wherePk) return null;
    return {
      kind: 'n+1',
      title: '疑似 N+1：循环单条按主键查询',
      detail: `${table || '目标表'} 按单个主键等值查询，若在循环中被逐条调用将产生 N+1；建议改为 WHERE pk = ANY($1) 一次性批量取回后在内存映射。`,
      table,
      columns: ['id'],
      sqlSnippet: 'SELECT ... WHERE id = ANY($1::bigint[])',
      estimatedImpact: 'high',
    };
  },
];

/**
 * 纯函数：对单条 SQL 做静态规则分析，输出优化建议列表。
 *
 * 语义：
 *  - sql 非字符串 / 空串 → []；
 *  - 归一化为小写后逐条规则检测，命中即收集，不中断（一条 SQL 可有多条建议）；
 *  - 不执行、不连库、不读取参数值，仅基于文本模板。
 */
export function optimizeQueryPerformance(sql: string): Optimization[] {
  if (typeof sql !== 'string' || sql.trim().length === 0) return [];
  const lower = sql.toLowerCase();
  const table = extractTable(lower);
  const out: Optimization[] = [];
  for (const rule of RULES) {
    const hit = rule(lower, sql, table);
    if (hit) out.push(hit);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 进程内有界 TTL 缓存（零依赖 Map，与 M128-D 同构但独立计数）          */
/* ------------------------------------------------------------------ */

interface QoCacheEntry {
  value: unknown;
  expiresAt: number;
}

const qoCache = new Map<string, QoCacheEntry>();
let qoHits = 0;
let qoMisses = 0;

/** 缓存运行统计（供 admin 面板观测命中率） */
export interface QueryCacheStats {
  size: number;
  hits: number;
  misses: number;
  /** 命中率 0..1（保留 4 位小数），无采样时为 0 */
  hitRate: number;
  maxKeys: number;
}

/**
 * 纯语义包装：带 TTL 的查询缓存。
 *  - key 相同且未过期 → 命中，不调用 queryFn；
 *  - 未命中 / 过期 → 调用 queryFn（支持 sync / async）并写回缓存；
 *  - ttlMs <= 0 或空 key → 旁路缓存，直接查询不计统计；
 *  - nowMs 可注入（默认 Date.now()），单测可确定性推进时间。
 */
export async function withQueryCache<T>(
  key: string,
  queryFn: () => T | Promise<T>,
  ttlMs: number,
  nowMs: number = Date.now(),
): Promise<T> {
  if (typeof key !== 'string' || key.length === 0 || !(ttlMs > 0)) {
    return await queryFn();
  }
  const hit = qoCache.get(key);
  if (hit && nowMs < hit.expiresAt) {
    qoHits += 1;
    return hit.value as T;
  }
  qoMisses += 1;
  const value = await queryFn();
  if (qoCache.size >= MAX_CACHE_KEYS && !qoCache.has(key)) {
    const oldest = qoCache.keys().next().value;
    if (typeof oldest === 'string') qoCache.delete(oldest);
  }
  qoCache.set(key, { value, expiresAt: nowMs + ttlMs });
  return value;
}

/** 读取缓存快照（不修改内部状态） */
export function getQueryCacheStats(): QueryCacheStats {
  const total = qoHits + qoMisses;
  return {
    size: qoCache.size,
    hits: qoHits,
    misses: qoMisses,
    hitRate: total > 0 ? Math.round((qoHits / total) * 10000) / 10000 : 0,
    maxKeys: MAX_CACHE_KEYS,
  };
}

/** 清空缓存并重置统计（供单测隔离 / 管理端手动失效） */
export function clearQueryOptimizationCache(): void {
  qoCache.clear();
  qoHits = 0;
  qoMisses = 0;
}
