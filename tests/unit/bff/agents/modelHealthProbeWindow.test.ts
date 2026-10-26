/**
 * 健澜AI原生医院操作系统OS - A01 滑动窗口健康聚合纯函数单元测试
 *
 * 覆盖：空台账比率记 0、窗口外事件不计入、成功率 / 错误率 / 平均时延聚合、
 * 连续失败尾部计数与熔断阈值口径（与 probeOnce 状态机一致）；时间戳入参注入，
 * 不发起 HTTP、不持久化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  aggregateHealthWindow,
  buildHealthWindowEvent,
  type HealthWindowEvent,
} from '@/bff/agents/modelHealthProbe.js';

const CARD = 'probe-001';
const NOW = 1_761_000_000_000;
const WINDOW_MS = 60_000;

function event(at: number, available: boolean, latencyMs?: number): HealthWindowEvent {
  return buildHealthWindowEvent(CARD, { available, latencyMs }, at);
}

describe('aggregateHealthWindow - 空台账', () => {
  it('空台账比率 / 时延记 0，连续失败为 0、熔断关闭', () => {
    const summary = aggregateHealthWindow([], CARD, NOW, WINDOW_MS);
    expect(summary.sampleCount).toBe(0);
    expect(summary.successCount).toBe(0);
    expect(summary.failureCount).toBe(0);
    expect(summary.successRate).toBe(0);
    expect(summary.errorRate).toBe(0);
    expect(summary.avgLatencyMs).toBe(0);
    expect(summary.consecutiveFailures).toBe(0);
    expect(summary.circuitOpen).toBe(false);
  });
});

describe('aggregateHealthWindow - 窗口内样本聚合', () => {
  it('成功率 / 错误率 / 平均时延按窗口内样本计算，成功样本参与时延均值', () => {
    const events = [
      event(NOW - 50_000, true, 100),
      event(NOW - 30_000, true, 200),
      event(NOW - 10_000, false),
    ];
    const summary = aggregateHealthWindow(events, CARD, NOW, WINDOW_MS);
    expect(summary.sampleCount).toBe(3);
    expect(summary.successCount).toBe(2);
    expect(summary.failureCount).toBe(1);
    expect(summary.successRate).toBeCloseTo(2 / 3, 3);
    expect(summary.errorRate).toBeCloseTo(1 / 3, 3);
    expect(summary.avgLatencyMs).toBe(150);
  });

  it('窗口外事件不计入样本、成功率与时延均值', () => {
    const events = [
      event(NOW - 61_000, false),
      event(NOW - 60_001, true, 50),
      event(NOW - 40_000, true, 180),
      event(NOW - 20_000, true, 160),
    ];
    const summary = aggregateHealthWindow(events, CARD, NOW, WINDOW_MS);
    expect(summary.sampleCount).toBe(2);
    expect(summary.successRate).toBe(1);
    expect(summary.errorRate).toBe(0);
    expect(summary.avgLatencyMs).toBe(170);
  });

  it('其他卡片事件不计入本卡片窗口', () => {
    const other = buildHealthWindowEvent('probe-002', { available: false }, NOW - 10_000);
    const summary = aggregateHealthWindow([other, event(NOW - 10_000, true, 120)], CARD, NOW, WINDOW_MS);
    expect(summary.sampleCount).toBe(1);
    expect(summary.successCount).toBe(1);
  });
});

describe('aggregateHealthWindow - 连续失败与熔断口径', () => {
  it('尾部连续失败达到默认阈值 3 次打开熔断；2 次不打开', () => {
    const events = [
      event(NOW - 50_000, true, 120),
      event(NOW - 30_000, false),
      event(NOW - 20_000, false),
      event(NOW - 10_000, false),
    ];
    const summary = aggregateHealthWindow(events, CARD, NOW, WINDOW_MS);
    expect(summary.consecutiveFailures).toBe(3);
    expect(summary.circuitOpen).toBe(true);

    const shorter = aggregateHealthWindow(events.slice(0, 3), CARD, NOW, WINDOW_MS);
    expect(shorter.consecutiveFailures).toBe(2);
    expect(shorter.circuitOpen).toBe(false);
  });

  it('最近一次成功后连续失败计数清零；中间失败不影响尾部计数', () => {
    const events = [
      event(NOW - 50_000, false),
      event(NOW - 30_000, false),
      event(NOW - 20_000, true, 140),
      event(NOW - 10_000, true, 160),
    ];
    const summary = aggregateHealthWindow(events, CARD, NOW, WINDOW_MS);
    expect(summary.consecutiveFailures).toBe(0);
    expect(summary.circuitOpen).toBe(false);
  });

  it('自定义阈值：2 次失败即按入参阈值打开熔断', () => {
    const events = [event(NOW - 20_000, false), event(NOW - 10_000, false)];
    const summary = aggregateHealthWindow(events, CARD, NOW, WINDOW_MS, { failureThreshold: 2 });
    expect(summary.consecutiveFailures).toBe(2);
    expect(summary.circuitOpen).toBe(true);
  });
});
