/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - LLMClient（确定性可测部分；流式网络部分由 MockLLMClient 覆盖）
 */

import { describe, it, expect } from 'bun:test';
import { LLMClient } from '@/core/agent/LLMClient';

describe('LLMClient - 模型配置', () => {
  const client = new LLMClient({ apiKey: 'sk-test', enableCache: false });

  it('应返回 sonnet 模型配置', () => {
    const model = client.getModel('sonnet');
    expect(model.alias).toBe('sonnet');
    expect(model.contextWindow).toBeGreaterThan(0);
    expect(model.model).toContain('claude');
  });

  it('应返回 opus / haiku 模型配置', () => {
    expect(client.getModel('opus').alias).toBe('opus');
    expect(client.getModel('haiku').alias).toBe('haiku');
  });

  it('初始累计用量应为0', () => {
    const usage = client.getCumulativeUsage();
    expect(usage.input).toBe(0);
    expect(usage.output).toBe(0);
  });

  it('getCumulativeUsage 应返回副本而非内部引用', () => {
    const usage = client.getCumulativeUsage();
    usage.input = 9999;
    const again = client.getCumulativeUsage();
    expect(again.input).toBe(0);
  });
});

describe('LLMClient - 缓存', () => {
  it('enableCache=false 时构造不应抛错且可清理缓存', () => {
    const client = new LLMClient({ apiKey: 'sk-test', enableCache: false });
    expect(() => client.clearCache()).not.toThrow();
  });
});
