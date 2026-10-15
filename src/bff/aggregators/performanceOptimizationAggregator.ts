/**
 * 健澜科技 jlmedaios - 系统性能优化聚合器（M128-D）
 *
 * 【移动端+性能优化】面向移动端高频读路径的 BFF 层缓存与慢查询识别。
 *
 * 分层：
 *  - 纯函数：identifySlowQueries / PERFORMANCE_INDEX_RECOMMENDATIONS，
 *    不读时钟、不访问 IO、不修改入参，可直接单测；
 *  - 进程内缓存：buildQueryWithCache 是对 queryFn 的 TTL 包装，缓存落在
 *       有界 Map（默认上限 1024 key，零新依赖），由 server.ts / admin 路由按需
 *       包装聚合查询；命中即返回缓存副本，未命中才真正调用 queryFn。
 *
 * 生产安全加固：
 *  - 缓存有界（MAX_CACHE_KEYS），键爆炸 / 慢查询风暴下不会内存无限增长；
 *  - TTL 通过可注入的 nowMs 时钟计算，默认 Date.now()，单测可确定性推进时间；
 *  - identifySlowQueries 对空数组、负时长、非数值（时钟回拨 / 脏数据）全部防御，
 *    返回过滤结果而非抛错；
 *  - 缓存只存 BFF 聚合结果（不含逐行 PII），进程重启即清空，仅用于运行时加速；
 *  - 命中返回前做副本保护由调用方保证，本层不把内部可变对象外泄。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 单条查询日志（BFF / DB 慢查询采样摘要，不含参数值 / PII） */
export interface QueryLogEntry {
  /** SQL 语句或查询模板摘要 */
  query: string;
  /** 耗时（ms） */
  durationMs: number;
  /** 触发时刻（epoch ms，可选） */
  recordedAt?: number;
}

/** 慢查询结果行 */
export interface SlowQuery {
  query: string;
  /** 耗时（ms，已 max(0, ...) 防御） */
  durationMs: number;
  /** 触发时刻（epoch ms，缺省 0） */
  recordedAt: number;
}

/** 索引建议行（与 249-performance-indexes.sql 对齐） */
export interface IndexRecommendation {
  /** 物理表名（含 schema） */
  table: string;
  /** 建议复合索引列序 */
  columns: string[];
  /** 面向的移动端读路径 */
  purpose: string;
}

/* ------------------------------------------------------------------ */
/* 索引建议（纯数据，与迁移脚本一一对应）                                */
/* ------------------------------------------------------------------ */

/**
 * 【移动端+性能优化】三条推荐索引，与 deploy/postgres/init/249-performance-indexes.sql
 * 保持一一对应；admin 面板据此向运维展示「已建 / 待建」状态。
 */
export const PERFORMANCE_INDEX_RECOMMENDATIONS: readonly IndexRecommendation[] = [
  {
    table: 'medmuse.staff_decision_memory',
    columns: ['staff_id', 'created_at'],
    purpose: '移动端工作台按员工拉取近期决策记忆（等值过滤 + 时间倒序）',
  },
  {
    table: 'medmuse.patient_feedback',
    columns: ['dept_code', 'created_at'],
    purpose: '移动端科室反馈看板按科室拉近期样本做满意度排名',
  },
  {
    table: 'medmuse.system_error_log',
    columns: ['created_at', 'resolved'],
    purpose: '运维移动端告警中心按时间窗口拉未闭环错误工单',
  },
];

/* ------------------------------------------------------------------ */
/* 进程内 TTL 缓存                                                     */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/** 缓存键上限（有界，防止键爆炸导致内存无界增长） */
const MAX_CACHE_KEYS = 1024;

const cache = new Map<string, CacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * 纯函数：带 TTL 的查询包装。
 *
 * 语义：
 *  - key 相同且未过期（nowMs < expiresAt）→ 命中缓存，不调用 queryFn；
 *  - 未命中 / 已过期 → 调用 queryFn（支持 sync / async），结果写回缓存；
 *  - ttlMs <= 0 视为「不缓存」：每次都真实查询，且不计入统计；
 *  - key 为空串视为非法键：直接查询，不写缓存；
 *  - nowMs 可注入（默认 Date.now()），便于单测确定性推进时间。
 *
 * 注意：本函数依赖模块级 Map 做缓存存储，「纯」体现在对 queryFn 结果的
 * 缓存语义确定性——相同 (key, nowMs) 下命中行为可复现，不依赖随机数 / 全局时钟副作用。
 */
export async function buildQueryWithCache<T>(
  key: string,
  queryFn: () => T | Promise<T>,
  ttlMs: number,
  nowMs: number = Date.now(),
): Promise<T> {
  // 非法键 / 零 TTL：旁路缓存，直接查询
  if (typeof key !== 'string' || key.length === 0 || !(ttlMs > 0)) {
    return await queryFn();
  }

  const hit = cache.get(key);
  if (hit && nowMs < hit.expiresAt) {
    cacheHits += 1;
    return hit.value as T;
  }

  cacheMisses += 1;
  const value = await queryFn();

  // 有界淘汰：超上限时删除最早插入的键（Map 保持插入序，近似 LRU）
  if (cache.size >= MAX_CACHE_KEYS && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (typeof oldest === 'string') cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: nowMs + ttlMs });
  return value;
}

/** 缓存运行统计（供 admin 面板观测命中率） */
export interface PerformanceCacheStats {
  size: number;
  hits: number;
  misses: number;
  /** 命中率 0..1（保留 4 位小数），无采样时为 0 */
  hitRate: number;
  maxKeys: number;
}

/** 读取缓存快照（不修改内部状态） */
export function getPerformanceCacheStats(): PerformanceCacheStats {
  const total = cacheHits + cacheMisses;
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? Math.round((cacheHits / total) * 10000) / 10000 : 0,
    maxKeys: MAX_CACHE_KEYS,
  };
}

/** 清空缓存并重置统计（供单测隔离 / 管理端手动失效） */
export function clearPerformanceCache(): void {
  cache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/* ------------------------------------------------------------------ */
/* 纯函数：慢查询识别                                                   */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：从查询日志中筛出耗时 >= thresholdMs 的慢查询，
 * 结果按耗时降序返回（副本，不改入参）。
 *
 * 防御：
 *  - logs 非数组 / 空数组 → []；
 *  - thresholdMs <= 0 → []（无意义阈值）；
 *  - 单条 durationMs 非有限数 → 按 0 计（仍过滤），负时长 → 0。
 */
export function identifySlowQueries(
  logs: QueryLogEntry[],
  thresholdMs: number,
): SlowQuery[] {
  const list = Array.isArray(logs) ? logs : [];
  if (list.length === 0 || !(thresholdMs > 0)) return [];

  return list
    .map((entry) => {
      const duration = Number.isFinite(entry?.durationMs)
        ? Math.max(0, Math.round(entry.durationMs))
        : 0;
      return {
        query: typeof entry?.query === 'string' ? entry.query : '',
        durationMs: duration,
        recordedAt:
          typeof entry?.recordedAt === 'number' && Number.isFinite(entry.recordedAt)
            ? entry.recordedAt
            : 0,
      } satisfies SlowQuery;
    })
    .filter((row) => row.query.length > 0 && row.durationMs >= thresholdMs)
    .sort((a, b) => b.durationMs - a.durationMs);
}
