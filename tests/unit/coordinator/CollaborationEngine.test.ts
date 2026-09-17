/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - CollaborationEngine 协作引擎
 */

import { describe, it, expect } from 'bun:test';
import { CollaborationEngine } from '@/core/coordinator/CollaborationEngine';
import type { AgentExecutor } from '@/core/coordinator/CollaborationEngine';
import type { AgentRequest, AgentResponse } from '@/types/agent';

/** 构造一个记录调用顺序的 Mock executor */
function makeRecordingExecutor(
  outputs: Record<string, string>,
): { executor: AgentExecutor; calls: string[] } {
  const calls: string[] = [];
  const executor: AgentExecutor = async (name, req) => {
    calls.push(name);
    return {
      responseId: `r_${name}`,
      requestId: req.requestId,
      sessionId: req.sessionId,
      agentId: name,
      success: true,
      output: outputs[name] ?? `${name} output`,
      toolCalls: [],
      toolResults: [],
      confidence: 0.8,
      durationMs: 1,
      tokens: 5,
      timestamp: Date.now(),
    };
  };
  return { executor, calls };
}

function makeRequest(): AgentRequest {
  return {
    requestId: 'req-1',
    sessionId: 'sess-1',
    userInput: '分析这个病例',
    priority: 'routine',
    timestamp: Date.now(),
  };
}

describe('CollaborationEngine', () => {
  const engine = new CollaborationEngine();

  it('runChain 应按顺序执行并传递上游输出', async () => {
    const { executor, calls } = makeRecordingExecutor({
      a: 'A 的结论',
      b: 'B 的结论',
    });
    const res = await engine.runChain(['a', 'b'], makeRequest(), executor);
    expect(calls).toEqual(['a', 'b']);
    expect(res.partials.length).toBe(2);
    expect(res.output).toContain('A 的结论');
    expect(res.output).toContain('B 的结论');
  });

  it('runParallel 应并行执行全部 Agent', async () => {
    const { executor, calls } = makeRecordingExecutor({ x: 'x', y: 'y', z: 'z' });
    const res = await engine.runParallel(['x', 'y', 'z'], makeRequest(), executor);
    expect(calls.length).toBe(3);
    expect(res.partials.length).toBe(3);
  });

  it('runMasterSlave 应先并行 slave 再 master 汇总', async () => {
    const { executor, calls } = makeRecordingExecutor({
      med: '内科意见',
      surgery: '外科意见',
      chief: '综合意见',
    });
    const res = await engine.runMasterSlave(
      'chief',
      ['med', 'surgery'],
      makeRequest(),
      executor,
    );
    expect(calls).toContain('chief');
    expect(res.output).toContain('综合意见');
  });

  it('merge_dedup 聚合应去除重复输出', () => {
    const r1: AgentResponse = {
      responseId: '1', requestId: 'r', sessionId: 's', agentId: 'a',
      success: true, output: '相同结论', toolCalls: [], toolResults: [],
      confidence: 0.9, durationMs: 1, tokens: 1, timestamp: Date.now(),
    };
    const r2 = { ...r1, responseId: '2', agentId: 'b' };
    const res = engine.aggregate([r1, r2], {
      strategy: 'merge_dedup',
      sessionId: 's',
      durationMs: 0,
    });
    expect(res.output.match(/相同结论/g)!.length).toBe(1);
  });

  it('weighted 聚合应取置信度最高者为主结论', () => {
    const mk = (agentId: string, conf: number, text: string): AgentResponse => ({
      responseId: 'r', requestId: 'r', sessionId: 's', agentId,
      success: true, output: text, toolCalls: [], toolResults: [],
      confidence: conf, durationMs: 1, tokens: 1, timestamp: Date.now(),
    });
    const res = engine.aggregate(
      [mk('low', 0.4, '低置信'), mk('high', 0.95, '高置信结论')],
      { strategy: 'weighted', sessionId: 's', durationMs: 0 },
    );
    expect(res.output).toContain('高置信结论');
  });

  it('结论冲突时应标记 hasConflict', () => {
    const mk = (agentId: string, text: string): AgentResponse => ({
      responseId: 'r', requestId: 'r', sessionId: 's', agentId,
      success: true, output: text, toolCalls: [], toolResults: [],
      confidence: 0.9, durationMs: 1, tokens: 1, timestamp: Date.now(),
    });
    const res = engine.aggregate(
      [mk('a', '诊断：高血压'), mk('b', '诊断：糖尿病')],
      { strategy: 'merge_dedup', sessionId: 's', durationMs: 0 },
    );
    expect(res.hasConflict).toBe(true);
  });
});
