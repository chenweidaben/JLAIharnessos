/**
 * 健澜AI原生医院操作系统OS - 模型健康探针单元测试（S-02）
 *
 * 覆盖：成功清零/关熔断/写时延、失败累计与阈值熔断、冷却期保持打开、
 * 半开成功关闭 / 半开失败重开、定时循环调用与停止、探针异常不中断循环、
 * 未登记卡片拒绝探测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import {
  getModelRegistry,
  _resetModelRegistry,
  type ModelCard,
  type ModelRegistry,
} from '@/bff/agents/modelRegistry.js';
import {
  probeOnce,
  startProbeLoop,
  _resetProbeLoop,
  type ProbeFn,
} from '@/bff/agents/modelHealthProbe.js';

/** 构造合法测试卡片 */
function makeCard(overrides: Partial<ModelCard> = {}): ModelCard {
  return {
    id: 'probe-001',
    displayName: '主力大模型（门诊病历）',
    provider: 'openai-compatible',
    endpointRef: 'cred-radar-main',
    model: 'radar-main-70b',
    tier: 'primary',
    role: 'main-large',
    contextWindow: 128_000,
    capabilities: ['长文本', '中文'],
    riskLevel: 'medium',
    defaultParams: { temperature: 0.2, topP: 0.9, maxTokens: 4096 },
    knowledgeDependencies: [],
    departmentScope: [],
    scenarioTags: ['门诊病历'],
    owner: '陈维',
    releasedAt: '2026-10-20T08:00:00.000Z',
    version: '1.0.0',
    status: 'active',
    sessionSticky: false,
    health: {
      checkedAt: '2026-10-20T08:00:00.000Z',
      available: true,
      consecutiveFailures: 0,
      circuitOpen: false,
    },
    ...overrides,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let registry: ModelRegistry;
let clock: number;
const now = () => clock;

beforeEach(() => {
  _resetModelRegistry();
  _resetProbeLoop();
  clock = 1_761_000_000_000;
  registry = getModelRegistry();
  registry.register(makeCard());
});

afterEach(() => {
  _resetProbeLoop();
});

// ============================================================================
// 单次探测：成功路径
// ============================================================================

describe('probeOnce - 成功探测', () => {
  it('成功探测清零失败计数、关闭熔断、写入 P50 时延并清空 lastError', () => {
    // 先制造一次失败
    probeOnce(registry, 'probe-001', { available: false, error: 'upstream 503' }, { now });
    let health = registry.getCard('probe-001')?.health;
    expect(health?.consecutiveFailures).toBe(1);
    expect(health?.available).toBe(false);

    // 成功探测：计数清零、熔断关闭、时延落盘、错误清空
    const snapshot = probeOnce(
      registry,
      'probe-001',
      { available: true, latencyMs: 180 },
      { now },
    );
    expect(snapshot.available).toBe(true);
    expect(snapshot.consecutiveFailures).toBe(0);
    expect(snapshot.circuitOpen).toBe(false);
    expect(snapshot.latencyMsP50).toBe(180);
    expect(snapshot.lastError).toBeUndefined();

    health = registry.getCard('probe-001')?.health;
    expect(health?.available).toBe(true);
    expect(health?.consecutiveFailures).toBe(0);
    expect(health?.circuitOpen).toBe(false);
    expect(health?.lastError).toBeUndefined();
  });

  it('未登记 cardId 抛出中文错误', () => {
    expect(() =>
      probeOnce(registry, 'missing-001', { available: true }, { now }),
    ).toThrow(/REG-001.*missing-001/);
  });
});

// ============================================================================
// 单次探测：失败累计与熔断阈值
// ============================================================================

describe('probeOnce - 失败累计与熔断', () => {
  it('连续失败达到阈值（3 次）打开熔断，available=false 并落盘 lastError', () => {
    for (let i = 0; i < 3; i++) {
      probeOnce(registry, 'probe-001', { available: false, error: 'upstream 503' }, { now });
    }
    const health = registry.getCard('probe-001')?.health;
    expect(health?.consecutiveFailures).toBe(3);
    expect(health?.circuitOpen).toBe(true);
    expect(health?.available).toBe(false);
    expect(health?.lastError).toBe('upstream 503');
  });

  it('低于阈值不打开熔断，仅累计失败计数并标记不可用', () => {
    probeOnce(registry, 'probe-001', { available: false, error: 'timeout' }, { now });
    probeOnce(registry, 'probe-001', { available: false, error: 'timeout' }, { now });
    const health = registry.getCard('probe-001')?.health;
    expect(health?.consecutiveFailures).toBe(2);
    expect(health?.circuitOpen).toBe(false);
    expect(health?.available).toBe(false);
    expect(health?.lastError).toBe('timeout');
  });
});

// ============================================================================
// 冷却期与半开语义
// ============================================================================

describe('probeOnce - 冷却期与半开语义', () => {
  it('冷却期内失败保持熔断打开，不清零失败计数，刷新最近错误', () => {
    for (let i = 0; i < 3; i++) {
      probeOnce(registry, 'probe-001', { available: false, error: 'upstream 503' }, { now });
    }
    clock += 10_000; // 距熔断打开 10s，仍在 60s 冷却期内
    probeOnce(registry, 'probe-001', { available: false, error: 'still down' }, { now });

    const health = registry.getCard('probe-001')?.health;
    expect(health?.circuitOpen).toBe(true);
    expect(health?.available).toBe(false);
    expect(health?.consecutiveFailures).toBe(3);
    expect(health?.lastError).toBe('still down');
  });

  it('冷却期内成功不清零、不关闭熔断', () => {
    for (let i = 0; i < 3; i++) {
      probeOnce(registry, 'probe-001', { available: false, error: 'upstream 503' }, { now });
    }
    clock += 10_000; // 冷却期内
    probeOnce(registry, 'probe-001', { available: true, latencyMs: 100 }, { now });

    const health = registry.getCard('probe-001')?.health;
    expect(health?.circuitOpen).toBe(true);
    expect(health?.available).toBe(false);
    expect(health?.consecutiveFailures).toBe(3);
    expect(health?.lastError).toBe('upstream 503');
  });

  it('冷却到期后半开探测成功关闭熔断', () => {
    for (let i = 0; i < 3; i++) {
      probeOnce(registry, 'probe-001', { available: false, error: 'upstream 503' }, { now });
    }
    clock += 61_000; // 冷却 60s 已到期，进入半开
    const snapshot = probeOnce(
      registry,
      'probe-001',
      { available: true, latencyMs: 150 },
      { now },
    );
    expect(snapshot.circuitOpen).toBe(false);
    expect(snapshot.available).toBe(true);
    expect(snapshot.consecutiveFailures).toBe(0);
    expect(snapshot.latencyMsP50).toBe(150);
    expect(snapshot.lastError).toBeUndefined();
  });

  it('冷却到期后半开探测失败重新打开熔断，计数归 1', () => {
    for (let i = 0; i < 3; i++) {
      probeOnce(registry, 'probe-001', { available: false, error: 'upstream 503' }, { now });
    }
    clock += 61_000; // 冷却到期，半开探测失败
    const snapshot = probeOnce(
      registry,
      'probe-001',
      { available: false, error: 'half-open failed' },
      { now },
    );
    expect(snapshot.circuitOpen).toBe(true);
    expect(snapshot.available).toBe(false);
    expect(snapshot.consecutiveFailures).toBe(1);
    expect(snapshot.lastError).toBe('half-open failed');
  });
});

// ============================================================================
// 定时探测循环
// ============================================================================

describe('startProbeLoop - 定时循环', () => {
  it('按间隔调用注入探针；stop 后不再调用', async () => {
    const probeFn = mock<ProbeFn>(async () => ({ available: true, latencyMs: 120 }));
    const stop = startProbeLoop(registry, 0.02, probeFn);

    await sleep(120);
    expect(probeFn.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(probeFn.mock.calls.length).toBeLessThanOrEqual(12);

    stop();
    const countAfterStop = probeFn.mock.calls.length;
    await sleep(80);
    expect(probeFn.mock.calls.length).toBe(countAfterStop);
  });

  it('探针抛错被捕获记为失败，循环不中断', async () => {
    const probeFn = mock<ProbeFn>(async () => {
      throw new Error('probe boom');
    });
    startProbeLoop(registry, 0.02, probeFn);

    await sleep(80);
    expect(probeFn.mock.calls.length).toBeGreaterThanOrEqual(2);

    const health = registry.getCard('probe-001')?.health;
    expect(health?.available).toBe(false);
    expect(health?.lastError).toContain('探针执行异常');
    expect(health?.lastError).toContain('probe boom');
  });

  it('未指定 cardIds 时仅遍历 active / shadow / standby 卡片', async () => {
    registry.register(makeCard({ id: 'draft-001', status: 'draft' }));
    const probeFn = mock<ProbeFn>(async () => ({ available: true }));
    const stop = startProbeLoop(registry, 0.02, probeFn);

    await sleep(80);
    const probedIds = probeFn.mock.calls.map((call) => call[0].id);
    expect(probedIds).toContain('probe-001');
    expect(probedIds).not.toContain('draft-001');
    stop();
  });

  it('重复启动先停旧循环，旧探针不再被调用', async () => {
    const probeFn1 = mock<ProbeFn>(async () => ({ available: true }));
    const stop1 = startProbeLoop(registry, 0.02, probeFn1);
    await sleep(30);

    const probeFn2 = mock<ProbeFn>(async () => ({ available: true }));
    const stop2 = startProbeLoop(registry, 0.02, probeFn2);
    await sleep(60);

    expect(probeFn1.mock.calls.length).toBeLessThanOrEqual(2);
    expect(probeFn2.mock.calls.length).toBeGreaterThanOrEqual(2);
    stop1();
    stop2();
  });
});
