/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - AgentRegistry 智能体注册中心
 */

import { describe, it, expect } from 'bun:test';
import { AgentRegistry } from '@/core/coordinator/AgentRegistry';
import type { ExecutableAgent } from '@/core/coordinator/types';
import type { AgentRequest, AgentResponse } from '@/types/agent';

/** 构造一个 Mock 可执行 Agent */
function makeAgent(
  name: string,
  caps: ExecutableAgent['metadata']['capabilities'],
  overrides: Partial<ExecutableAgent['metadata']> = {},
): ExecutableAgent {
  return {
    metadata: {
      name,
      displayName: name,
      description: `Mock ${name}`,
      layer: 'L1',
      capabilities: caps,
      tools: ['query_patient'],
      priority: 0,
      model: 'sonnet',
      maxConcurrency: 2,
      timeoutMs: 60_000,
      healthy: true,
      ...overrides,
    },
    async execute(_req: AgentRequest): Promise<AgentResponse> {
      return {
        responseId: `resp_${name}`,
        requestId: _req.requestId,
        sessionId: _req.sessionId,
        agentId: name,
        success: true,
        output: `${name} done`,
        toolCalls: [],
        toolResults: [],
        confidence: 0.9,
        durationMs: 1,
        tokens: 10,
        timestamp: Date.now(),
      };
    },
  };
}

describe('AgentRegistry', () => {
  it('应注册并获取 Agent', () => {
    const reg = new AgentRegistry();
    const ads = makeAgent('ads', ['record_writing']);
    reg.register(ads);
    expect(reg.size).toBe(1);
    expect(reg.get('ads')).toBe(ads);
  });

  it('重复注册同名 Agent 应抛错', () => {
    const reg = new AgentRegistry();
    reg.register(makeAgent('dup', []));
    expect(() => reg.register(makeAgent('dup', []))).toThrow();
  });

  it('应支持注销', () => {
    const reg = new AgentRegistry();
    reg.register(makeAgent('tmp', []));
    expect(reg.unregister('tmp')).toBe(true);
    expect(reg.has('tmp')).toBe(false);
  });

  it('应按能力标签查询并按优先级排序', () => {
    const reg = new AgentRegistry();
    reg.register(makeAgent('low', ['diagnosis'], { priority: 1 }));
    reg.register(makeAgent('high', ['diagnosis'], { priority: 9 }));
    const found = reg.findByCapability('diagnosis');
    expect(found.map((a) => a.metadata.name)).toEqual(['high', 'low']);
  });

  it('acquire/release 应维护负载', () => {
    const reg = new AgentRegistry();
    reg.register(makeAgent('busy', [], { maxConcurrency: 1 }));
    reg.acquire('busy');
    expect(reg.getLoad('busy')!.activeTasks).toBe(1);
    // 第二次 acquire 应因并发已满抛错
    expect(() => reg.acquire('busy')).toThrow();
    reg.release('busy', 10, true);
    expect(reg.getLoad('busy')!.activeTasks).toBe(0);
    expect(reg.getLoad('busy')!.recentFailures).toBe(0);
  });

  it('失败时应累计 recentFailures', () => {
    const reg = new AgentRegistry();
    reg.register(makeAgent('flaky', []));
    reg.acquire('flaky');
    reg.release('flaky', 5, false);
    expect(reg.getLoad('flaky')!.recentFailures).toBe(1);
  });

  it('pickLeastLoaded 应选负载最低者', () => {
    const reg = new AgentRegistry();
    reg.register(makeAgent('a', [], { maxConcurrency: 5 }));
    reg.register(makeAgent('b', [], { maxConcurrency: 5 }));
    reg.acquire('a');
    const chosen = reg.pickLeastLoaded(['a', 'b']);
    expect(chosen!.metadata.name).toBe('b');
  });

  it('不可用 Agent 不应被选中', () => {
    const reg = new AgentRegistry();
    const dead = makeAgent('dead', [], { healthy: false });
    reg.register(dead);
    expect(reg.pickLeastLoaded(['dead'])).toBeUndefined();
  });
});
