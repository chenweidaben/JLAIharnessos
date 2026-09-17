/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - SuperScheduler 超级调度器
 * 验证：意图识别 → 能力匹配 → 路由分发 → 结果聚合 完整流程。
 */

import { describe, it, expect } from 'bun:test';
import { AgentRegistry } from '@/core/coordinator/AgentRegistry';
import { IntentClassifier } from '@/core/coordinator/IntentClassifier';
import { CollaborationEngine } from '@/core/coordinator/CollaborationEngine';
import { SuperScheduler } from '@/core/coordinator/SuperScheduler';
import type { ExecutableAgent } from '@/core/coordinator/types';
import type { AgentRequest, AgentResponse } from '@/types/agent';

/** 构造记录被调用次数的 Mock Agent */
function makeMockAgent(
  name: string,
  caps: ExecutableAgent['metadata']['capabilities'],
  output: string,
): { agent: ExecutableAgent; calls: { count: number } } {
  const calls = { count: 0 };
  const agent: ExecutableAgent = {
    metadata: {
      name,
      displayName: name,
      description: `Mock ${name}`,
      layer: 'L1',
      capabilities: caps,
      tools: ['query_patient'],
      priority: 5,
      model: 'sonnet',
      maxConcurrency: 3,
      timeoutMs: 30_000,
      healthy: true,
    },
    async execute(_req: AgentRequest): Promise<AgentResponse> {
      calls.count++;
      return {
        responseId: `resp_${name}`,
        requestId: _req.requestId,
        sessionId: _req.sessionId,
        agentId: name,
        success: true,
        output,
        toolCalls: [],
        toolResults: [],
        confidence: 0.85,
        durationMs: 2,
        tokens: 20,
        timestamp: Date.now(),
      };
    },
  };
  return { agent, calls };
}

function makeRequest(input: string): AgentRequest {
  return {
    requestId: `req_${Date.now()}`,
    sessionId: 'sess-test',
    userInput: input,
    priority: 'routine',
    timestamp: Date.now(),
  };
}

describe('SuperScheduler 完整调度流程', () => {
  function buildScheduler() {
    const registry = new AgentRegistry();
    const classifier = new IntentClassifier();
    const engine = new CollaborationEngine();
    const scheduler = new SuperScheduler(registry, classifier, engine);
    return { registry, scheduler };
  }

  it('应将病历书写请求路由到具备 record_writing 能力的 Agent', async () => {
    const { registry, scheduler } = buildScheduler();
    const ads = makeMockAgent('ag01_ads', ['record_writing'], '病历草稿已生成');
    registry.register(ads.agent);

    const res = await scheduler.dispatch(makeRequest('帮我写个病程记录'));
    expect(ads.calls.count).toBeGreaterThanOrEqual(1);
    expect(res.output).toContain('病历草稿已生成');
  });

  it('诊断建议应并行分发多个相关 Agent', async () => {
    const { registry, scheduler } = buildScheduler();
    const diag = makeMockAgent('ag03_diag', ['diagnosis'], '鉴别诊断：高血压');
    const lab = makeMockAgent('ag04_lab', ['lab_interpretation'], '检验异常：血脂高');
    registry.register(diag.agent);
    registry.register(lab.agent);

    const res = await scheduler.dispatch(makeRequest('帮我分析一下这个病例考虑什么病，这份血常规指标有没有问题'));
    // 诊断建议是 parallel 策略，两个 Agent 都应被调用
    expect(diag.calls.count).toBe(1);
    expect(lab.calls.count).toBe(1);
    expect(res.partials.length).toBe(2);
  });

  it('plan() 应返回路由计划且不执行', () => {
    const { registry, scheduler } = buildScheduler();
    const qc = makeMockAgent('ag07_qc', ['quality_control'], '质控结果');
    registry.register(qc.agent);

    const plan = scheduler.plan(makeRequest('检查一下病历质量有没有扣分'));
    expect(plan.primaryIntent).toBe('质控检查');
    expect(plan.agentNames).toContain('ag07_qc');
    expect(qc.calls.count).toBe(0); // plan 不应触发执行
  });

  it('无候选 Agent 时应回退到 main 且不抛异常', async () => {
    const { scheduler } = buildScheduler();
    const res = await scheduler.dispatch(makeRequest('查一下患者历史'));
    // 没有任何注册 Agent，应降级返回而非崩溃
    expect(res.partials.length).toBeGreaterThan(0);
  });

  it('事件触发：subscribe + emit 应调用订阅 Agent', async () => {
    const { registry, scheduler } = buildScheduler();
    const risk = makeMockAgent('ag06_risk', ['diagnosis'], '风险预警：危急值');
    registry.register(risk.agent);
    scheduler.subscribe('critical_value', 'ag06_risk');

    const res = await scheduler.emit('critical_value', makeRequest('出现危急值'));
    expect(risk.calls.count).toBe(1);
    expect(res.output).toContain('风险预警');
  });

  it('Agent 抛错时应返回失败响应而非崩溃', async () => {
    const { registry, scheduler } = buildScheduler();
    const flaky: ExecutableAgent = {
      metadata: {
        name: 'flaky',
        displayName: 'flaky',
        description: '',
        layer: 'L1',
        capabilities: ['teaching'],
        tools: [],
        priority: 1,
        model: 'sonnet',
        maxConcurrency: 2,
        timeoutMs: 1000,
        healthy: true,
      },
      async execute(): Promise<AgentResponse> {
        throw new Error('boom');
      },
    };
    registry.register(flaky);

    const res = await scheduler.dispatch(makeRequest('创建一个虚拟患者做教学'));
    expect(res.partials[0].success).toBe(false);
  });
});
