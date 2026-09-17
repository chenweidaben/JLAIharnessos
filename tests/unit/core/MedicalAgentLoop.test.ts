/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { describe, expect, test } from 'bun:test';
import { MedicalAgentLoop, type MedicalAgentLoopEvent } from '@/core/agent/MedicalAgentLoop';
import { AgentEventBus } from '@/core/events/AgentEventBus';
import { MedicalToolRegistry } from '@/core/tools/MedicalToolRegistry';
import { ToolRiskManager } from '@/core/tools/ToolRiskManager';
import { ToolExecutor } from '@/core/tools/ToolExecutor';
import { MockLLMClient, createMockTool } from './helpers';
import { createMockContext } from '../tools/testHelpers';
import type { LoopToolUseBlock } from '@/core/agent/loopTypes';

/** 装配主循环依赖 */
function setupLoop(toolName = 'query_patient') {
  const tool = createMockTool(toolName, { patientId: 'P1', name: '张*三' });
  const registry = new MedicalToolRegistry();
  registry.register(tool);
  const riskManager = new ToolRiskManager(false);
  const executor = new ToolExecutor(registry, riskManager);
  const eventBus = new AgentEventBus();
  return { tool, registry, riskManager, executor, eventBus };
}

describe('MedicalAgentLoop', () => {
  test('纯文本回答：无工具调用直接结束', async () => {
    const { executor, eventBus } = setupLoop();
    const llm = new MockLLMClient([{ text: '患者目前生命体征平稳。' }]);
    const loop = new MedicalAgentLoop({ llm, executor, eventBus });

    const ctx = createMockContext();
    const events = [];
    for await (const ev of loop.run({
      sessionId: 's1',
      userInput: '患者情况如何？',
      user: ctx.user,
      tools: [],
      toolContext: ctx,
    })) {
      events.push(ev.type);
    }

    expect(events).toContain('response_delta');
    expect(events).toContain('response_end');
    expect(events[events.length - 1]).toBe('done');
  });

  test('工具调用流程：LLM 发起工具调用 → 执行 → 回传结果 → 文本收尾', async () => {
    const { tool, executor, eventBus } = setupLoop('query_patient');

    const toolCall: LoopToolUseBlock = {
      type: 'tool_use',
      id: 'call_1',
      name: 'query_patient',
      input: { patientId: 'P1' },
    };
    // 第一轮发起工具调用，第二轮给出文本结论
    const llm = new MockLLMClient([
      { toolCalls: [toolCall] },
      { text: '已获取患者信息：冠心病，青霉素过敏。' },
    ]);
    const loop = new MedicalAgentLoop({ llm, executor, eventBus });

    const ctx = createMockContext();
    const types: string[] = [];
    let doneEvent: Extract<MedicalAgentLoopEvent, { type: 'done' }> | null = null;

    for await (const ev of loop.run({
      sessionId: 's1',
      userInput: '查一下患者',
      user: ctx.user,
      tools: [tool],
      toolContext: ctx,
    })) {
      types.push(ev.type);
      if (ev.type === 'done') doneEvent = ev;
    }

    expect(types).toContain('tool_call_start');
    expect(types).toContain('tool_call_end');
    expect(tool.callInputs).toHaveLength(1);
    expect(tool.callInputs[0]).toEqual({ patientId: 'P1' });
    expect(doneEvent).not.toBeNull();
    expect(doneEvent!.totalToolCalls).toBe(1);
    expect(llm.callCount).toBe(2);
  });

  test('达到最大轮次时安全退出', async () => {
    const { executor, eventBus } = setupLoop('echo_tool');
    const loop = new MedicalAgentLoop({ llm: new MockLLMClient([]), executor, eventBus });
    const ctx = createMockContext();

    let last = '';
    for await (const ev of loop.run({
      sessionId: 's1',
      userInput: 'hi',
      user: ctx.user,
      tools: [],
      toolContext: ctx,
      maxTurns: 1,
    })) {
      last = ev.type;
    }
    expect(last).toBe('done');
  });

  test('未知工具调用返回错误结果', async () => {
    const { executor, eventBus } = setupLoop('real_tool');
    const unknownCall: LoopToolUseBlock = {
      type: 'tool_use',
      id: 'cX',
      name: 'not_exist_tool',
      input: {},
    };
    const llm = new MockLLMClient([
      { toolCalls: [unknownCall] },
      { text: '工具不存在，已提示。' },
    ]);
    const loop = new MedicalAgentLoop({ llm, executor, eventBus });
    const ctx = createMockContext();

    const endEvents: string[] = [];
    for await (const ev of loop.run({
      sessionId: 's1',
      userInput: 'call unknown',
      user: ctx.user,
      tools: [],
      toolContext: ctx,
    })) {
      if (ev.type === 'tool_call_end') endEvents.push(ev.type);
    }
    expect(endEvents).toHaveLength(1);
  });
});
