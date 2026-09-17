/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - TokenBudgetTracker Token预算追踪器
 */

import { describe, it, expect } from 'bun:test';
import { TokenBudgetTracker, estimateTokens } from '@/core/context/TokenBudgetTracker';

describe('TokenBudgetTracker', () => {
  it('初始状态应无用量', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    expect(tracker.getUsage().total).toBe(0);
    expect(tracker.getBudget().used).toBe(0);
  });

  it('addUsage 应累加输入输出 Token', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: 100, output: 50 });
    tracker.addUsage({ input: 200, output: 80 });
    const usage = tracker.getUsage();
    expect(usage.input).toBe(300);
    expect(usage.output).toBe(130);
    expect(usage.total).toBe(430);
  });

  it('负数用量应被忽略', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: -100, output: -50 });
    expect(tracker.getUsage().total).toBe(0);
  });

  it('setComponent 应记录各组成部分估算', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 100);
    tracker.setComponent('toolResults', 300);
    const components = tracker.getComponents();
    expect(components.systemPrompt).toBe(100);
    expect(components.toolResults).toBe(300);
  });

  it('getBudget 应返回使用率百分比', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: 500, output: 0 });
    const budget = tracker.getBudget();
    expect(budget.total).toBe(1000);
    expect(budget.percentage).toBe(50);
  });

  it('低使用率不应触发压缩', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: 100, output: 0 }); // 10%
    const decision = tracker.evaluateCompaction();
    expect(decision.shouldCompact).toBe(false);
    expect(decision.level).toBe('none');
  });

  it('超过60%应触发 microcompact', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 650);
    const decision = tracker.evaluateCompaction();
    expect(decision.shouldCompact).toBe(true);
    expect(decision.level).toBe('microcompact');
  });

  it('超过80%应触发 collapse', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 850);
    const decision = tracker.evaluateCompaction();
    expect(decision.level).toBe('collapse');
  });

  it('超过95%应触发 autocompact', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.setComponent('systemPrompt', 960);
    const decision = tracker.evaluateCompaction();
    expect(decision.level).toBe('autocompact');
  });

  it('isToolResultOversized 应判断单条结果是否过大', () => {
    const tracker = new TokenBudgetTracker();
    expect(tracker.isToolResultOversized(3000)).toBe(true);
    expect(tracker.isToolResultOversized(100)).toBe(false);
  });

  it('reset 应清零累计用量并可选保留组成部分', () => {
    const tracker = new TokenBudgetTracker({ totalTokens: 1000 });
    tracker.addUsage({ input: 100, output: 50 });
    tracker.setComponent('systemPrompt', 100);
    tracker.reset(true);
    expect(tracker.getUsage().total).toBe(0);
    expect(tracker.getComponents().systemPrompt).toBe(100);
    tracker.reset();
    expect(tracker.getComponents().systemPrompt).toBe(0);
  });
});

describe('estimateTokens', () => {
  it('空字符串返回0', () => {
    expect(estimateTokens('')).toBe(0);
  });
  it('应按字符数近似估算 Token', () => {
    expect(estimateTokens('这是一段测试文本')).toBeGreaterThan(0);
  });
});
