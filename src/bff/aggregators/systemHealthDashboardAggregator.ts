/**
 * 健澜科技 jlmedaios - 系统健康检查总览聚合器（M124-D，运维工具）
 *
 * 【运维工具】面向 admin 的系统健康总览：把采集端原始指标（metrics）归并为
 * 一页可读的健康总览（dashboard），并据此给出整体健康结论
 * healthy / degraded / down。
 *
 * 分层（与仓库既有 aggregator 约定一致）：
 *  - buildSystemHealthDashboard(metrics)：纯函数。输入未判定的原始指标快照，
 *    输出已归一化（磁盘/内存/错误率统一为百分数）的健康总览；不读时钟、不碰 IO，
 *    可直接单测。
 *  - getOverallHealthStatus(dashboard)：纯函数。基于阈值给出整体结论。
 *
 * 结论口径（阈值见下方导出常量，便于单测覆盖边界）：
 *  - down：任一关键依赖不可达（数据库 down 或 LLM 网关 down）——核心链路断裂；
 *  - degraded：无 down，但存在资源/质量越线（磁盘≥90%、内存≥90%、错误率≥5%）；
 *  - healthy：以上皆非。
 *
 * 注意：本模块不采集、不落库、不含 PII；采集由路由（adminHealth.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 阈值（导出以便单测覆盖边界）                                          */
/* ------------------------------------------------------------------ */

/** 磁盘使用率达到该比例（0..1）→ degraded */
export const DISK_DEGRADED_RATIO = 0.9;
/** 内存使用率达到该比例（0..1）→ degraded */
export const MEMORY_DEGRADED_RATIO = 0.9;
/** 错误率达到该比例（0..1）→ degraded */
export const ERROR_RATE_DEGRADED = 0.05;

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 关键依赖可达性判定结果 */
export type ComponentStatus = 'up' | 'down';

/** 整体健康结论 */
export type OverallHealthStatus = 'healthy' | 'degraded' | 'down';

/**
 * 采集端原始指标快照（未判定健康度）。
 * buildSystemHealthDashboard 仅消费本结构，字段缺失/越界由函数内部防御性收敛。
 */
export interface SystemHealthMetrics {
  /** 数据库探活（SELECT 1）是否成功 */
  db: { reachable: boolean };
  /** LLM 网关探活是否成功 */
  llm: { reachable: boolean };
  /** 磁盘使用率，0..1（越界值在聚合时收敛） */
  disk: { usedRatio: number };
  /** 内存使用率，0..1 */
  memory: { usedRatio: number };
  /** 今日累计 HTTP 请求数 */
  todayRequests: number;
  /** 今日错误率，0..1 */
  errorRate: number;
  /** 最近一次成功备份时间（ISO 字符串），无备份记录为 null */
  lastBackup: string | null;
}

/**
 * 健康总览（前端看板直接消费）。
 * 磁盘/内存/错误率统一为百分数（0..100），保留 1 位小数。
 */
export interface SystemHealthDashboard {
  /** 数据库状态 */
  dbStatus: ComponentStatus;
  /** LLM 网关状态 */
  llmStatus: ComponentStatus;
  /** 磁盘使用率（百分数 0..100） */
  diskUsage: number;
  /** 内存使用率（百分数 0..100） */
  memoryUsage: number;
  /** 今日累计请求数 */
  todayRequests: number;
  /** 错误率（百分数 0..100） */
  errorRate: number;
  /** 最近备份时间（ISO），无则 null */
  lastBackup: string | null;
}

/* ------------------------------------------------------------------ */
/* 纯函数：原始指标 → 健康总览                                          */
/* ------------------------------------------------------------------ */

/** 收敛到 [0,1]，NaN/Infinity 归 0 */
function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** 0..1 → 百分数，保留 1 位小数 */
function toPercent01(v01: number): number {
  return Math.round(clamp01(v01) * 1000) / 10;
}

/**
 * 纯函数：把原始指标快照归并为健康总览。
 * 不读时钟、不访问 IO；对越界/非法输入做防御性收敛，保证输出恒为有限值。
 */
export function buildSystemHealthDashboard(
  metrics: SystemHealthMetrics,
): SystemHealthDashboard {
  const dbStatus: ComponentStatus = metrics.db.reachable ? 'up' : 'down';
  const llmStatus: ComponentStatus = metrics.llm.reachable ? 'up' : 'down';

  const diskUsage = toPercent01(metrics.disk.usedRatio);
  const memoryUsage = toPercent01(metrics.memory.usedRatio);
  const errorRate = toPercent01(metrics.errorRate);

  const todayRequests = Number.isFinite(metrics.todayRequests)
    ? Math.max(0, Math.round(metrics.todayRequests))
    : 0;

  return {
    dbStatus,
    llmStatus,
    diskUsage,
    memoryUsage,
    todayRequests,
    errorRate,
    lastBackup:
      typeof metrics.lastBackup === 'string' && metrics.lastBackup.length > 0
        ? metrics.lastBackup
        : null,
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数：健康总览 → 整体健康结论                                      */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：基于阈值判定整体健康结论。
 *  - down：数据库或 LLM 网关不可达（核心链路断裂，优先级最高）；
 *  - degraded：无 down，但磁盘/内存/错误率任一越线；
 *  - healthy：其余情况。
 */
export function getOverallHealthStatus(
  dashboard: SystemHealthDashboard,
): OverallHealthStatus {
  if (dashboard.dbStatus === 'down' || dashboard.llmStatus === 'down') {
    return 'down';
  }

  if (
    dashboard.diskUsage >= DISK_DEGRADED_RATIO * 100 ||
    dashboard.memoryUsage >= MEMORY_DEGRADED_RATIO * 100 ||
    dashboard.errorRate >= ERROR_RATE_DEGRADED * 100
  ) {
    return 'degraded';
  }

  return 'healthy';
}
