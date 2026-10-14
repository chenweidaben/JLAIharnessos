/**
 * MEDMUSE Agent 健康度指标采集与看板聚合（纯函数 + 进程内内存计数）。
 *
 * 设计边界：
 *   - recordCall(agent, durationMs, ok)：写入今日调用统计（进程内 Map，跨自然日自动清零）；
 *   - buildHealthBoard(snapshot)：纯函数，输入「agent -> 今日统计」快照，输出
 *     每 agent 今日调用数 / 平均响应 / 失败率 / 熔断状态，并汇总 overall 结论；
 *   - 熔断为派生状态：样本数达最小门槛且失败率达阈值即视为 open，不写库、不依赖外部状态，
 *     便于单测对阈值边界做确定性断言；
 *   - 不连数据库、不抛错；无调用记录的 agent 不出现在看板中（未知即未知，不臆造健康）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 触发熔断的失败率阈值（含）：失败率 >= 50% 视为熔断 */
export const CIRCUIT_FAILURE_RATE = 0.5;
/** 最小样本数：今日调用数低于该值时不因失败率熔断，避免偶发 1~2 次失败误判 */
export const MIN_CALLS_TO_TRIP = 5;
/** 平均响应超过该值（ms）记为慢响应（warning） */
export const SLOW_AVG_MS = 3000;
/** 失败率达到该值（且未熔断）记为 warning */
export const WARNING_FAILURE_RATE = 0.2;

/** 单个 agent 的今日累计计数（内存态） */
export interface AgentCallRecord {
  /** 今日总调用数 */
  calls: number;
  /** 今日失败调用数 */
  failures: number;
  /** 今日累计耗时（ms），平均响应 = totalDurationMs / calls */
  totalDurationMs: number;
}

export type AgentStatus = 'healthy' | 'warning' | 'critical';

/** 看板中单个 agent 的一行 */
export interface AgentHealthRow {
  agent: string;
  calls: number;
  failures: number;
  /** 平均响应（ms），无调用为 0 */
  avgDurationMs: number;
  /** 失败率 0~1 */
  failureRate: number;
  /** 熔断状态：true=已熔断（open） */
  circuitOpen: boolean;
  status: AgentStatus;
}

/** 健康度看板整体返回 */
export interface HealthBoard {
  overall: AgentStatus;
  generatedAt: string;
  totals: { calls: number; failures: number; avgDurationMs: number };
  agents: AgentHealthRow[];
}

/* ---------------------------------------------------------------------------
 * 进程内内存计数（跨天清零）
 * ------------------------------------------------------------------------ */

const dayKey = (): string => new Date().toISOString().slice(0, 10);

let metrics = new Map<string, AgentCallRecord>();
let currentDay = dayKey();

/** 跨自然日则清空今日计数（轻量内存看板，不做持久化） */
function rollDayIfNeeded(): void {
  const k = dayKey();
  if (k !== currentDay) {
    metrics = new Map<string, AgentCallRecord>();
    currentDay = k;
  }
}

/**
 * 记录一次 agent 调用。
 * @param agent      agent 标识（roleCode / agentId）
 * @param durationMs 本次耗时（ms），负值按 0 处理
 * @param ok         是否成功（false 计入失败率）
 */
export function recordCall(agent: string, durationMs: number, ok: boolean): void {
  if (!agent) return;
  rollDayIfNeeded();
  const rec = metrics.get(agent) ?? { calls: 0, failures: 0, totalDurationMs: 0 };
  rec.calls += 1;
  rec.totalDurationMs += Math.max(0, durationMs);
  if (!ok) rec.failures += 1;
  metrics.set(agent, rec);
}

/** 取今日计数快照（深拷贝，供纯函数聚合）。 */
export function takeSnapshot(): Record<string, AgentCallRecord> {
  rollDayIfNeeded();
  const out: Record<string, AgentCallRecord> = {};
  for (const [agent, rec] of metrics) {
    out[agent] = { calls: rec.calls, failures: rec.failures, totalDurationMs: rec.totalDurationMs };
  }
  return out;
}

/** 清空计数（测试/运维用）。 */
export function resetMetrics(): void {
  metrics = new Map<string, AgentCallRecord>();
}

/* ---------------------------------------------------------------------------
 * 纯函数：快照 -> 看板
 * ------------------------------------------------------------------------ */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 由今日统计快照构建健康度看板。纯函数：不读模块态、不产生副作用，仅依赖入参。
 *
 * 逐 agent 状态：
 *   - circuitOpen：calls >= MIN_CALLS_TO_TRIP 且 failureRate >= CIRCUIT_FAILURE_RATE；
 *   - critical：已熔断；
 *   - warning：失败率 >= WARNING_FAILURE_RATE，或平均响应 >= SLOW_AVG_MS；
 *   - healthy：其余。
 * overall：任一 agent 熔断 -> critical；否则任一 agent warning -> warning；否则 healthy。
 */
export function buildHealthBoard(
  snapshot: Record<string, AgentCallRecord>,
  now: string = new Date().toISOString(),
): HealthBoard {
  const agents: AgentHealthRow[] = Object.entries(snapshot)
    .map(([agent, rec]) => {
      const calls = Math.max(0, rec.calls);
      const failures = Math.min(Math.max(0, rec.failures), calls);
      const avg = calls > 0 ? rec.totalDurationMs / calls : 0;
      const failureRate = calls > 0 ? failures / calls : 0;
      const circuitOpen = calls >= MIN_CALLS_TO_TRIP && failureRate >= CIRCUIT_FAILURE_RATE;

      let status: AgentStatus = 'healthy';
      if (circuitOpen) {
        status = 'critical';
      } else if (failureRate >= WARNING_FAILURE_RATE || avg >= SLOW_AVG_MS) {
        status = 'warning';
      }

      return {
        agent,
        calls,
        failures,
        avgDurationMs: round1(avg),
        failureRate: Math.round(failureRate * 10000) / 10000,
        circuitOpen,
        status,
      };
    })
    // 调用数多的在前；同数按 agent 名字典序，保证看板稳定可测
    .sort((a, b) => b.calls - a.calls || a.agent.localeCompare(b.agent));

  let sumCalls = 0;
  let sumFailures = 0;
  let sumDuration = 0;
  for (const rec of Object.values(snapshot)) {
    sumCalls += Math.max(0, rec.calls);
    sumFailures += Math.max(0, rec.failures);
    sumDuration += Math.max(0, rec.totalDurationMs);
  }

  const overall: AgentStatus = agents.some((r) => r.circuitOpen)
    ? 'critical'
    : agents.some((r) => r.status === 'warning')
      ? 'warning'
      : 'healthy';

  return {
    overall,
    generatedAt: now,
    totals: {
      calls: sumCalls,
      failures: sumFailures,
      avgDurationMs: sumCalls > 0 ? round1(sumDuration / sumCalls) : 0,
    },
    agents,
  };
}
