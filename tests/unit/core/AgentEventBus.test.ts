/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { describe, expect, test } from 'bun:test';
import { AgentEventBus } from '@/core/events/AgentEventBus';
import { TokenBudgetTracker, estimateTokens } from '@/core/context/TokenBudgetTracker';

describe('AgentEventBus', () => {
  test('订阅并接收类型事件', () => {
    const bus = new AgentEventBus();
    let received = 0;
    bus.on('response_delta', () => {
      received++;
    });
    bus.publish({ type: 'response_delta', sessionId: 's1', data: { text: '你好' } });
    bus.publish({ type: 'tool_call_start', sessionId: 's1', data: {} });
    expect(received).toBe(1);
  });

  test('unsubscribe 后不再接收', () => {
    const bus = new AgentEventBus();
    let received = 0;
    const sub = bus.on('response_delta', () => received++);
    bus.publish({ type: 'response_delta', sessionId: 's1', data: {} });
    sub.unsubscribe();
    bus.publish({ type: 'response_delta', sessionId: 's1', data: {} });
    expect(received).toBe(1);
  });

  test('通配订阅接收所有事件', () => {
    const bus = new AgentEventBus();
    let count = 0;
    bus.onAny(() => count++);
    bus.publish({ type: 'response_start', sessionId: 's1', data: {} });
    bus.publish({ type: 'error', sessionId: 's1', data: {} });
    expect(count).toBe(2);
  });

  test('订阅者异常不影响其他订阅者', () => {
    const bus = new AgentEventBus();
    let second = 0;
    bus.on('response_delta', () => {
      throw new Error('boom');
    });
    bus.on('response_delta', () => second++);
    bus.publish({ type: 'response_delta', sessionId: 's1', data: {} });
    expect(second).toBe(1);
  });

  test('历史记录按 session 过滤', () => {
    const bus = new AgentEventBus();
    bus.publish({ type: 'response_delta', sessionId: 's1', data: {} });
    bus.publish({ type: 'response_delta', sessionId: 's2', data: {} });
    expect(bus.getHistory({ sessionId: 's1' })).toHaveLength(1);
  });
});

describe('TokenBudgetTracker', () => {
  test('累计 Token 与预算百分比', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: 300, output: 200 });
    const usage = tracker.getUsage();
    expect(usage.input).toBe(300);
    expect(usage.output).toBe(200);
    expect(usage.total).toBe(500);
    expect(tracker.getBudget().percentage).toBe(50);
  });

  test('60% 触发 microcompact', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 650);
    expect(tracker.evaluateCompaction().level).toBe('microcompact');
  });

  test('80% 触发 collapse', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 850);
    expect(tracker.evaluateCompaction().level).toBe('collapse');
  });

  test('95% 触发 autocompact', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 960);
    expect(tracker.evaluateCompaction().level).toBe('autocompact');
  });

  test('estimateTokens 非零', () => {
    expect(estimateTokens('你好世界测试')).toBeGreaterThan(0);
    expect(estimateTokens('')).toBe(0);
  });
});
