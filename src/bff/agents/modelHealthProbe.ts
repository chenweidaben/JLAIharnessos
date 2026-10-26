/**
 * 健澜AI原生医院操作系统OS - bff/agents/modelHealthProbe.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 模型健康探针（技术文档 3.2.3 健康探针模块、3.2.6 验收标准）：定时轻量探测、
 * 失败计数、熔断状态同步、快照写回注册表。熔断口径对齐既有 modelProvider
 * 基线：连续失败 3 次触发熔断、冷却 60s；冷却到期后进入半开状态，下次探测
 * 成功即关闭熔断，失败重新打开。
 *
 * 本切片（S-02）不实现真实 HTTP 探测：ProbeFn 由调用方注入；本模块不连数据库、
 * 不发起网络请求。主备模型接管、异常自动摘除编排属 S-03，不在本切片范围。
 *
 * @module bff/agents/modelHealthProbe
 */

import {
  type ModelCard,
  type ModelHealthSnapshot,
  type ModelRegistry,
} from './modelRegistry.js';

/** 单次探测结果（注入式探针返回值；不含密钥与患者明文） */
export interface ProbeOutcome {
  /** 探测是否成功（模型可用） */
  available: boolean;
  /** 本次探测时延（毫秒，成功时填写） */
  latencyMs?: number;
  /** 失败原因说明（失败时填写） */
  error?: string;
}

/** 注入式探针函数：由调用方提供真实探测逻辑，本切片不做 HTTP 调用 */
export type ProbeFn = (card: ModelCard) => Promise<ProbeOutcome>;

/** 探测选项：时钟注入便于单测；阈值与冷却时长可覆盖默认口径 */
export interface ProbeOptions {
  /** 时钟注入（返回毫秒时间戳）；缺省使用 Date.now */
  now?: () => number;
  /** 熔断阈值：连续失败次数达到即打开熔断，默认 3 */
  failureThreshold?: number;
  /** 熔断冷却时长（毫秒），默认 60_000（60s） */
  cooldownMs?: number;
}

/** 默认熔断阈值：连续失败 3 次触发（对齐 modelProvider 基线口径） */
export const DEFAULT_PROBE_FAILURE_THRESHOLD = 3;

/** 默认熔断冷却时长：60 秒（对齐 modelProvider 基线口径） */
export const DEFAULT_PROBE_COOLDOWN_MS = 60_000;

/** 纳入定时循环探测的状态集合 */
const PROBING_STATUSES = new Set<ModelCard['status']>(['active', 'shadow', 'standby']);

/** 熔断打开时间戳台账（进程内存；重启丢失属本切片口径，后续随注册表持久化） */
const openedAtByCard = new Map<string, number>();

/** 当前运行中的定时句柄（重复启动先停旧循环） */
let _timer: ReturnType<typeof setInterval> | null = null;

function stopLoop(): void {
  if (_timer !== null) {
    clearInterval(_timer);
    _timer = null;
  }
}

/**
 * 执行单次探测并把健康快照写回注册表。
 *
 * 语义：
 *  - 成功：连续失败清零、熔断关闭、available=true、写入 P50 时延、清空 lastError；
 *  - 失败：连续失败 +1；达到阈值打开熔断、available=false、落盘 lastError；
 *  - 冷却期内：保持熔断打开，不清零失败计数；
 *  - 冷却到期（半开）：探测成功关闭熔断；探测失败重新打开熔断、计数归 1。
 *
 * @param registry 注册表实例
 * @param cardId 模型卡片 ID
 * @param outcome 本次探测结果
 * @param options 时钟 / 阈值 / 冷却注入项
 * @returns 写入注册表后的健康快照深拷贝
 */
export function probeOnce(
  registry: ModelRegistry,
  cardId: string,
  outcome: ProbeOutcome,
  options?: ProbeOptions,
): ModelHealthSnapshot {
  const card = registry.getCardOrThrow(cardId);
  const now = options?.now ?? Date.now;
  const threshold = options?.failureThreshold ?? DEFAULT_PROBE_FAILURE_THRESHOLD;
  const cooldownMs = options?.cooldownMs ?? DEFAULT_PROBE_COOLDOWN_MS;
  const timestamp = now();
  const openedAt = openedAtByCard.get(cardId) ?? 0;
  const withinCooldown = card.health.circuitOpen && openedAt > 0 && timestamp - openedAt < cooldownMs;

  const snapshot: ModelHealthSnapshot = structuredClone(card.health);
  snapshot.checkedAt = new Date(timestamp).toISOString();

  if (outcome.available) {
    if (card.health.circuitOpen && withinCooldown) {
      // 冷却期内：熔断保持打开，不清零失败计数、不清除 lastError、不写时延
      snapshot.available = false;
      snapshot.circuitOpen = true;
    } else {
      // 正常成功，或半开状态探测成功 → 关闭熔断
      snapshot.available = true;
      snapshot.consecutiveFailures = 0;
      snapshot.circuitOpen = false;
      snapshot.lastError = undefined;
      if (typeof outcome.latencyMs === 'number' && Number.isFinite(outcome.latencyMs)) {
        snapshot.latencyMsP50 = outcome.latencyMs;
      }
      openedAtByCard.delete(cardId);
    }
  } else {
    const error = outcome.error?.trim() || '模型探测失败';
    if (card.health.circuitOpen && withinCooldown) {
      // 冷却期内：保持打开，保留既有失败计数，刷新最近错误
      snapshot.available = false;
      snapshot.circuitOpen = true;
      snapshot.lastError = error;
    } else if (card.health.circuitOpen) {
      // 半开状态探测失败：重新打开熔断，计数归 1
      openedAtByCard.set(cardId, timestamp);
      snapshot.available = false;
      snapshot.consecutiveFailures = 1;
      snapshot.circuitOpen = true;
      snapshot.lastError = error;
    } else {
      // 闭合状态失败：累计失败；达到阈值打开熔断
      snapshot.consecutiveFailures = card.health.consecutiveFailures + 1;
      snapshot.available = false;
      snapshot.circuitOpen = snapshot.consecutiveFailures >= threshold;
      snapshot.lastError = error;
      if (snapshot.circuitOpen) openedAtByCard.set(cardId, timestamp);
    }
  }

  registry.updateHealth(cardId, snapshot);
  return structuredClone(snapshot);
}

/**
 * 启动定时探测循环。
 *
 * - 未指定 cardIds 时，遍历注册表中 active / shadow / standby 状态卡片；
 * - 每次 tick 逐个调用注入探针，结果经 probeOnce 写回注册表；
 * - 探针抛错被捕获并记为失败，不中断循环；
 * - 返回停止句柄；重复启动先停旧循环。
 */
export function startProbeLoop(
  registry: ModelRegistry,
  intervalSec: number,
  probeFn: ProbeFn,
  cardIds?: string[],
): () => void {
  stopLoop();
  const intervalMs = intervalSec * 1000;

  _timer = setInterval(() => {
    const ids =
      cardIds ??
      registry
        .listCards()
        .filter((card) => PROBING_STATUSES.has(card.status))
        .map((card) => card.id);

    for (const id of ids) {
      const card = registry.getCard(id);
      if (!card) continue;
      void (async () => {
        try {
          const outcome = await probeFn(card);
          probeOnce(registry, id, outcome);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          probeOnce(registry, id, { available: false, error: `探针执行异常：${message}` });
        }
      })();
    }
  }, intervalMs);

  return () => stopLoop();
}

/** 测试专用：停止循环并清空熔断打开时间戳台账 */
export function _resetProbeLoop(): void {
  stopLoop();
  openedAtByCard.clear();
}

// ============================================================================
// A01：滑动窗口健康聚合纯函数（M-02 成功率 / 错误率 / 时延 / 连续失败）
// ============================================================================

/** 窗口内单次探测事件（时间戳入参注入；不含密钥与患者明文） */
export interface HealthWindowEvent {
  /** 模型卡片 ID */
  cardId: string;
  /** 探测是否成功 */
  available: boolean;
  /** 本次探测时延（毫秒，成功时填写） */
  latencyMs?: number;
  /** 事件时间戳（epoch 毫秒，由调用方注入，不依赖系统时钟） */
  at: number;
}

/** 滑动窗口聚合结果（空台账比率记 0，不抛错） */
export interface HealthWindowSummary {
  cardId: string;
  /** 窗口时长（毫秒，入参给定） */
  windowMs: number;
  /** 窗口内纳入统计的样本数 */
  sampleCount: number;
  successCount: number;
  failureCount: number;
  /** 成功率 0~1；空台账记 0 */
  successRate: number;
  /** 错误率 0~1；空台账记 0 */
  errorRate: number;
  /** 成功样本平均时延（毫秒）；无成功样本记 0 */
  avgLatencyMs: number;
  /** 从最近一次事件向前累计的连续失败次数 */
  consecutiveFailures: number;
  /** 连续失败达到既有熔断阈值时为 true（与 probeOnce 熔断口径一致） */
  circuitOpen: boolean;
}

/** 纯函数：构造窗口事件入参，不触碰台账与时钟 */
export function buildHealthWindowEvent(
  cardId: string,
  outcome: ProbeOutcome,
  at: number,
): HealthWindowEvent {
  return { cardId, available: outcome.available, latencyMs: outcome.latencyMs, at };
}

/**
 * 按滑动窗口聚合指定卡片探测事件。
 *
 * 口径：
 *  - 仅统计 `[now - windowMs, now]` 闭区间内、cardId 匹配的事件；窗口外事件不计入；
 *  - 空台账：successRate / errorRate / avgLatencyMs 记 0，consecutiveFailures=0、circuitOpen=false；
 *  - 平均时延仅取成功样本中有限时延值；无成功样本记 0；
 *  - consecutiveFailures 为时间倒序尾部连续失败数；达到默认熔断阈值（3 次）置 circuitOpen=true；
 *  - 纯函数：不发起 HTTP、不持久化、不读取进程外指标，时间戳与窗口长度均由入参给定。
 */
export function aggregateHealthWindow(
  events: readonly HealthWindowEvent[],
  cardId: string,
  now: number,
  windowMs: number,
  options?: { failureThreshold?: number },
): HealthWindowSummary {
  const threshold = options?.failureThreshold ?? DEFAULT_PROBE_FAILURE_THRESHOLD;
  const lower = now - windowMs;

  const inWindow = events
    .filter((event) => event.cardId === cardId && Number.isFinite(event.at) && event.at >= lower && event.at <= now)
    .slice()
    .sort((a, b) => a.at - b.at);

  const sampleCount = inWindow.length;
  const successCount = inWindow.filter((event) => event.available).length;
  const failureCount = sampleCount - successCount;
  const successRate = sampleCount > 0 ? successCount / sampleCount : 0;
  const errorRate = sampleCount > 0 ? failureCount / sampleCount : 0;

  const latencySamples = inWindow
    .filter((event) => event.available && typeof event.latencyMs === 'number' && Number.isFinite(event.latencyMs) && event.latencyMs >= 0)
    .map((event) => event.latencyMs as number);
  const avgLatencyMs =
    latencySamples.length > 0
      ? Math.round((latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length) * 10) / 10
      : 0;

  let consecutiveFailures = 0;
  for (let index = inWindow.length - 1; index >= 0; index -= 1) {
    if (!inWindow[index].available) consecutiveFailures += 1;
    else break;
  }

  return {
    cardId,
    windowMs,
    sampleCount,
    successCount,
    failureCount,
    successRate: Math.round(successRate * 1000) / 1000,
    errorRate: Math.round(errorRate * 1000) / 1000,
    avgLatencyMs,
    consecutiveFailures,
    circuitOpen: consecutiveFailures >= threshold,
  };
}
