/**
 * 健澜科技数智医院智能体 - 系统健康聚合器（BFF 延迟 / DB 连接池 / outbox 积压 / agent 熔断）
 *
 * 分层：
 *  - buildHealth(snap)：纯函数。输入采集端原始快照，输出分级（healthy/warning/critical）
 *    与 overall 结论，无 IO、无时钟副作用（仅 uptime 由快照字段推导），可直接单测。
 *  - collectHealth()：异步采集。BFF 启动时间/请求计数（模块内存计数，零新依赖）、
 *    DB 连接池（postgres.js 连接对象防御性读取 totalCount/idleCount；探活 SELECT 1；
 *    PG 不可达或 DEMO_MODE 时标 unknown/demo）、outbox 积压（复用 outboxRepo）、
 *    agent 熔断状态（内存 Map，默认全部 closed/正常）。
 *
 * 分级口径（可经 thresholds 覆盖）：
 *  - critical：任一组件 critical（DB 不可达 / 连接池使用率 ≥90% / outbox pending≥1000
 *    或最老 pending 滞留 ≥300s）；
 *  - warning：无 critical，但存在 warning 或 unknown（演示/采集失败保守降级）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool';
import {
  countByStatus,
  oldestPendingAgeSeconds,
} from '../../db/repositories/outboxRepo';
import { AGENT_REGISTRY } from '../agents/agentRegistry';

/* ------------------------------------------------------------------ */
/* 类型与阈值                                                          */
/* ------------------------------------------------------------------ */

/** 组件级严重度；unknown 用于演示模式 / 采集失败等"无法判定"场景 */
export type Severity = 'healthy' | 'warning' | 'critical' | 'unknown';
/** 汇总结论（不含 unknown，由 buildHealth 归并） */
export type OverallStatus = 'healthy' | 'warning' | 'critical';

export interface HealthThresholds {
  /** 连接池使用率（在用/上限）达到此比例 → warning */
  poolWarnRatio: number;
  /** 连接池使用率达到此比例 → critical */
  poolCritRatio: number;
  /** outbox pending 积压达到此条数 → warning */
  outboxWarnPending: number;
  /** outbox pending 积压达到此条数 → critical */
  outboxCritPending: number;
  /** 最老 pending 滞留秒数达到此值 → warning */
  outboxWarnAgeSeconds: number;
  /** 最老 pending 滞留秒数达到此值 → critical */
  outboxCritAgeSeconds: number;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  poolWarnRatio: 0.75,
  poolCritRatio: 0.9,
  outboxWarnPending: 200,
  outboxCritPending: 1000,
  outboxWarnAgeSeconds: 60,
  outboxCritAgeSeconds: 300,
};

/** 采集端原始快照（未判定严重度）：buildHealth 仅消费本结构 */
export interface HealthSnapshot {
  /** 是否演示模式（DEMO_MODE=1/true） */
  demo: boolean;
  bff: {
    /** 模块加载时间（≈BFF 进程启动），epoch ms */
    startedAtMs: number;
    /** 进程内累计 HTTP 请求数（由 recordSystemHttpRequest 递增） */
    requestCount: number;
  };
  db: {
    /** SELECT 1 探活是否成功 */
    reachable: boolean;
    /** postgres.js 连接总数（当前驱动版本未暴露时为 null） */
    totalCount: number | null;
    /** postgres.js 空闲连接数（同上） */
    idleCount: number | null;
    /** 连接池上限（PG_POOL_MAX） */
    max: number | null;
  };
  outbox: {
    /** 积压统计查询是否成功 */
    reachable: boolean;
    pending: number;
    dead: number;
    /** 最老 pending 滞留秒数（无 pending 为 0） */
    oldestAgeSeconds: number | null;
  };
  agents: {
    /** 注册智能体总数 */
    total: number;
    /** 当前熔断（tripped）的智能体 code 列表 */
    tripped: string[];
  };
}

export interface HealthCheck {
  key: 'bff' | 'db' | 'outbox' | 'agents';
  name: string;
  status: Severity;
  message: string;
}

export interface SystemHealth {
  overall: OverallStatus;
  demo: boolean;
  checkedAt: string;
  bff: {
    status: Severity;
    startedAt: string;
    uptimeSeconds: number;
    requestCount: number;
    message: string;
  };
  db: {
    status: Severity;
    totalCount: number | null;
    idleCount: number | null;
    usedCount: number | null;
    max: number | null;
    message: string;
  };
  outbox: {
    status: Severity;
    pending: number;
    dead: number;
    oldestAgeSeconds: number | null;
    message: string;
  };
  agents: {
    status: Severity;
    total: number;
    tripped: string[];
    message: string;
  };
  checks: HealthCheck[];
}

/* ------------------------------------------------------------------ */
/* 纯函数：快照 → 健康结论                                             */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<Severity, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  critical: 3,
};

function worst(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function clampOverall(s: Severity): OverallStatus {
  if (s === 'critical') return 'critical';
  // unknown（演示/采集失败）保守按 warning 呈现，避免静默绿灯
  return s === 'healthy' ? 'healthy' : 'warning';
}

/**
 * 纯函数：汇总快照各项状态 → overall 与各组件明细。
 * 不读时钟、不访问 IO；时间推导仅依赖 snap.bff.startedAtMs 与 nowMs（可注入，便于测试）。
 */
export function buildHealth(
  snap: HealthSnapshot,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
  nowMs: number = Date.now(),
): SystemHealth {
  /* ---- BFF：进程存活即 healthy，仅展示运行时长与请求计数 ---- */
  const uptimeSeconds = Math.max(0, Math.floor((nowMs - snap.bff.startedAtMs) / 1000));
  const bffStatus: Severity = 'healthy';
  const bffMessage = `BFF 进程正常（已运行 ${uptimeSeconds} 秒，累计 HTTP 请求 ${snap.bff.requestCount} 次）`;

  /* ---- DB 连接池 ---- */
  let dbStatus: Severity;
  let dbMessage: string;
  const { totalCount, idleCount, max } = snap.db;
  const usedCount =
    totalCount !== null && idleCount !== null ? totalCount - idleCount : null;

  if (snap.demo) {
    dbStatus = 'unknown';
    dbMessage = '演示模式（DEMO_MODE）：跳过 PostgreSQL，未建立连接池';
  } else if (!snap.db.reachable) {
    dbStatus = 'critical';
    dbMessage = 'PostgreSQL 不可达：SELECT 1 探活失败';
  } else if (
    usedCount !== null &&
    totalCount !== null &&
    idleCount !== null &&
    max !== null &&
    max > 0
  ) {
    const ratio = usedCount / max;
    if (ratio >= thresholds.poolCritRatio) {
      dbStatus = 'critical';
    } else if (ratio >= thresholds.poolWarnRatio) {
      dbStatus = 'warning';
    } else {
      dbStatus = 'healthy';
    }
    dbMessage = `连接池正常（在用 ${usedCount} / 空闲 ${idleCount} / 上限 ${max}，使用率 ${(ratio * 100).toFixed(1)}%）`;
  } else {
    dbStatus = 'healthy';
    dbMessage = 'PostgreSQL 连通；当前驱动版本未暴露连接池计数（totalCount/idleCount）';
  }

  /* ---- outbox 积压 ---- */
  let outboxStatus: Severity;
  let outboxMessage: string;
  const { pending, dead, oldestAgeSeconds } = snap.outbox;
  if (snap.demo || !snap.outbox.reachable) {
    outboxStatus = 'unknown';
    outboxMessage = snap.demo
      ? '演示模式：发件箱统计跳过'
      : '发件箱积压统计查询失败';
  } else {
    if (dead > 0) {
      outboxStatus = 'warning';
      outboxMessage = `存在 ${dead} 条死信待人工重投（pending ${pending} 条）`;
    } else if (pending >= thresholds.outboxCritPending) {
      outboxStatus = 'critical';
      outboxMessage = `事件积压严重：pending ${pending} 条（阈值 ${thresholds.outboxCritPending}）`;
    } else if (
      oldestAgeSeconds !== null &&
      oldestAgeSeconds >= thresholds.outboxCritAgeSeconds
    ) {
      outboxStatus = 'critical';
      outboxMessage = `最老未发布事件已滞留 ${oldestAgeSeconds} 秒，疑似 Relay 停摆`;
    } else if (pending >= thresholds.outboxWarnPending) {
      outboxStatus = 'warning';
      outboxMessage = `事件积压偏高：pending ${pending} 条`;
    } else if (
      oldestAgeSeconds !== null &&
      oldestAgeSeconds >= thresholds.outboxWarnAgeSeconds
    ) {
      outboxStatus = 'warning';
      outboxMessage = `最老未发布事件已滞留 ${oldestAgeSeconds} 秒，关注 Relay 吞吐`;
    } else {
      outboxStatus = 'healthy';
      outboxMessage = `积压正常（pending ${pending} 条，最老滞留 ${oldestAgeSeconds ?? 0} 秒，死信 ${dead} 条）`;
    }
  }

  /* ---- agent 熔断 ---- */
  let agentsStatus: Severity;
  let agentsMessage: string;
  if (snap.agents.tripped.length > 0) {
    agentsStatus = 'warning';
    agentsMessage = `${snap.agents.tripped.length} 个智能体处于熔断状态：${snap.agents.tripped.join('、')}`;
  } else {
    agentsStatus = 'healthy';
    agentsMessage = `${snap.agents.total} 个智能体全部正常（无熔断）`;
  }

  const checks: HealthCheck[] = [
    { key: 'bff', name: 'BFF 进程', status: bffStatus, message: bffMessage },
    { key: 'db', name: '数据库连接池', status: dbStatus, message: dbMessage },
    { key: 'outbox', name: '发件箱积压', status: outboxStatus, message: outboxMessage },
    { key: 'agents', name: '智能体熔断', status: agentsStatus, message: agentsMessage },
  ];

  const overall = clampOverall(
    worst(worst(bffStatus, dbStatus), worst(outboxStatus, agentsStatus)),
  );

  return {
    overall,
    demo: snap.demo,
    checkedAt: new Date(nowMs).toISOString(),
    bff: {
      status: bffStatus,
      startedAt: new Date(snap.bff.startedAtMs).toISOString(),
      uptimeSeconds,
      requestCount: snap.bff.requestCount,
      message: bffMessage,
    },
    db: {
      status: dbStatus,
      totalCount,
      idleCount,
      usedCount,
      max,
      message: dbMessage,
    },
    outbox: {
      status: outboxStatus,
      pending,
      dead,
      oldestAgeSeconds,
      message: outboxMessage,
    },
    agents: {
      status: agentsStatus,
      total: snap.agents.total,
      tripped: snap.agents.tripped,
      message: agentsMessage,
    },
    checks,
  };
}

/* ------------------------------------------------------------------ */
/* 进程内状态：启动时间 / 请求计数 / agent 熔断 Map（零新依赖）          */
/* ------------------------------------------------------------------ */

const startedAtMs = Date.now();
let httpRequestCount = 0;

/** 由 server.ts 在请求收尾时调用（一行），累计 HTTP 请求数 */
export function recordSystemHttpRequest(): void {
  httpRequestCount += 1;
}

/** 智能体熔断状态内存表：code -> closed(正常) / tripped(熔断)，默认全部正常 */
const agentCircuit = new Map<string, 'closed' | 'tripped'>();

/** 标记某智能体熔断（由 agent 运行时错误累计达阈值后调用） */
export function tripAgentCircuit(code: string): void {
  agentCircuit.set(code, 'tripped');
}

/** 恢复某智能体（人工确认后调用） */
export function resetAgentCircuit(code: string): void {
  agentCircuit.set(code, 'closed');
}

export function isAgentTripped(code: string): boolean {
  return agentCircuit.get(code) === 'tripped';
}

function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/* ------------------------------------------------------------------ */
/* 异步采集                                                             */
/* ------------------------------------------------------------------ */

/** SELECT 1 探活超时（毫秒）：健康巡检不应拖慢响应 */
const PING_TIMEOUT_MS = 2000;

async function collectDbState(demo: boolean): Promise<HealthSnapshot['db']> {
  if (demo) {
    return { reachable: false, totalCount: null, idleCount: null, max: null };
  }
  const max = Number(process.env.PG_POOL_MAX ?? 20);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sql = getDb() as any;
    const ping = sql`SELECT 1 AS ok` as Promise<unknown>;
    // 探活超时后该 promise 仍可能 reject，吞掉未处理拒绝
    void ping.catch(() => undefined);
    await Promise.race([
      ping,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db ping timeout')), PING_TIMEOUT_MS),
      ),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loose = sql as Record<string, unknown>;
    const totalCount = typeof loose.totalCount === 'number' ? loose.totalCount : null;
    const idleCount = typeof loose.idleCount === 'number' ? loose.idleCount : null;
    return { reachable: true, totalCount, idleCount, max };
  } catch {
    return { reachable: false, totalCount: null, idleCount: null, max };
  }
}

async function collectOutboxState(demo: boolean): Promise<HealthSnapshot['outbox']> {
  if (demo) {
    return { reachable: false, pending: 0, dead: 0, oldestAgeSeconds: null };
  }
  try {
    const counts = await countByStatus();
    const oldestAgeSeconds = await oldestPendingAgeSeconds();
    return {
      reachable: true,
      pending: counts.pending,
      dead: counts.dead,
      oldestAgeSeconds,
    };
  } catch {
    return { reachable: false, pending: 0, dead: 0, oldestAgeSeconds: null };
  }
}

/** 采集原始快照（各组件失败互不影响，分别降级） */
export async function collectSnapshot(): Promise<HealthSnapshot> {
  const demo = demoModeEnabled();
  const [db, outbox] = await Promise.all([
    collectDbState(demo),
    collectOutboxState(demo),
  ]);
  const tripped = Array.from(agentCircuit.entries())
    .filter(([, state]) => state === 'tripped')
    .map(([code]) => code);
  return {
    demo,
    bff: { startedAtMs, requestCount: httpRequestCount },
    db,
    outbox,
    agents: { total: Object.keys(AGENT_REGISTRY).length, tripped },
  };
}

/** 采集并汇总：路由 handler 的唯一入口 */
export async function collectHealth(): Promise<SystemHealth> {
  return buildHealth(await collectSnapshot());
}
