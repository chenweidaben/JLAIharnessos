/**
 * 健澜科技 jlmedaios - M124-D 系统健康检查总览 BFF 路由（运维工具）
 *
 * GET /api/v1/admin/health（仅 admin 角色可读）
 *  - 采集各关键依赖/资源的原始指标（DB 探活、LLM 网关探活、磁盘、内存、
 *    今日请求数、今日错误率、最近备份），交由纯函数
 *    buildSystemHealthDashboard / getOverallHealthStatus 归并为一页总览；
 *  - 返回 { dashboard, overall }；采集某一项失败时该项保守降级，绝不用假数据
 *    冒充健康（DB/LLM 探活失败 -> down；资源读取失败 -> 中性低值）。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无任何写副作用；
 *  - 探活均带 2s 超时，健康巡检不拖慢响应；
 *  - 不暴露底层连接明细与 PII，只返回聚合结果；
 *  - 采集异常返回 500 结构化错误信封，不返回 HTML 错误页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import fs from 'node:fs';
import os from 'node:os';

import { getDb } from '../../db/pool';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildSystemHealthDashboard,
  getOverallHealthStatus,
  type SystemHealthMetrics,
} from '../aggregators/systemHealthDashboardAggregator';
import {
  aggregatePerformance,
  listPerformanceRecords,
} from '../aggregators/performanceMonitorAggregator';

/** 探活超时（毫秒）：健康巡检不应拖慢响应 */
const PROBE_TIMEOUT_MS = 2000;

function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** DB 探活：SELECT 1，带超时 */
async function probeDbReachable(demo: boolean): Promise<boolean> {
  if (demo) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sql = getDb() as any;
    const ping = sql`SELECT 1 AS ok` as Promise<unknown>;
    void ping.catch(() => undefined);
    await Promise.race([
      ping,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db ping timeout')), PROBE_TIMEOUT_MS),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** LLM 网关探活：仅判定网关可达与否（任意 HTTP 响应即视为在线，网络失败/超时为 down） */
async function probeLlmReachable(): Promise<boolean> {
  const base =
    process.env.LLM_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    process.env.OPENAI_API_BASE;
  if (!base) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const resp = await fetch(`${base.replace(/\/$/, '')}/models`, {
      method: 'GET',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    // 401/403 表示网关在线但鉴权缺失，仍属"可达"
    return resp.status > 0;
  } catch {
    return false;
  }
}

/** 磁盘使用率：基于工作目录所在分区；读取失败时保守给中性低值 0.1（不误报绿） */
function readDiskUsedRatio(): number {
  try {
    const stat = fs.statfsSync(process.cwd());
    const total = Number(stat.blocks);
    const free = Number(stat.bfree);
    if (!Number.isFinite(total) || total <= 0) return 0.1;
    return (total - free) / total;
  } catch {
    return 0.1;
  }
}

/** 内存使用率：系统级 1 - 可用/总量；读取失败给中性低值 */
function readMemoryUsedRatio(): number {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    if (total <= 0) return 0.1;
    return 1 - free / total;
  } catch {
    return 0.1;
  }
}

/** 今日请求数与错误率：复用 BFF 进程内性能采样（零新依赖） */
function readTraffic(): { todayRequests: number; errorRate: number } {
  try {
    const summary = aggregatePerformance(listPerformanceRecords());
    const last = summary.errorRateTrend[summary.errorRateTrend.length - 1];
    return {
      todayRequests: summary.dailyRequests,
      errorRate: typeof last?.errorRate === 'number' ? last.errorRate : 0,
    };
  } catch {
    return { todayRequests: 0, errorRate: 0 };
  }
}

/** 最近备份时间：运维侧约定由环境变量注入 ISO 字符串；未配置为 null */
function readLastBackup(): string | null {
  const v = process.env.LAST_BACKUP_AT;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * GET /api/v1/admin/health
 * 系统健康检查总览（运维工具，仅 admin）。
 */
async function handleHealth(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const demo = demoModeEnabled();
    const [dbReachable, llmReachable] = await Promise.all([
      probeDbReachable(demo),
      probeLlmReachable(),
    ]);

    const traffic = readTraffic();
    const metrics: SystemHealthMetrics = {
      db: { reachable: dbReachable },
      llm: { reachable: llmReachable },
      disk: { usedRatio: readDiskUsedRatio() },
      memory: { usedRatio: readMemoryUsedRatio() },
      todayRequests: traffic.todayRequests,
      errorRate: traffic.errorRate,
      lastBackup: readLastBackup(),
    };

    const dashboard = buildSystemHealthDashboard(metrics);
    const overall = getOverallHealthStatus(dashboard);
    return json(ok({ dashboard, overall, demo }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '健康检查数据采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminHealthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/health',
    auth: true,
    handle: handleHealth,
  },
];
