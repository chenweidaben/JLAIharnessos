/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { describe, expect, test } from 'bun:test';
import { QueryEngine } from '@/core/agent/QueryEngine';
import { MedicalToolRegistry } from '@/core/tools/MedicalToolRegistry';
import { MockLLMClient, createMockTool } from './helpers';
import {
  createMockUser,
  createMockAuditLogger,
  createMockPermissionChecker,
  createMockConfirmationCallbacks,
  createMockConfig,
} from '../tools/testHelpers';
import type { LoopToolUseBlock } from '@/core/agent/loopTypes';

describe('QueryEngine', () => {
  test('初始状态为 idle，查询后状态流转', async () => {
    const registry = new MedicalToolRegistry();
    const llm = new MockLLMClient([{ text: '你好，有什么可以帮您？' }]);
    const engine = new QueryEngine({ registry, llm });

    expect(engine.getState().status).toBe('idle');

    const user = createMockUser();
    for await (const _ev of engine.query(
      {
        sessionId: 'sess_q1',
        user,
        userInput: '你好',
      },
      {
        audit: createMockAuditLogger(),
        permissionChecker: createMockPermissionChecker(),
        confirmation: createMockConfirmationCallbacks(),
        config: createMockConfig(),
      },
    )) {
      // 消费事件
    }

    expect(engine.getState().status).toBe('idle');
  });

  test('interrupt 后状态为 interrupted', () => {
    const registry = new MedicalToolRegistry();
    const llm = new MockLLMClient([{ text: 'x' }]);
    const engine = new QueryEngine({ registry, llm });
    engine.interrupt('test');
    expect(engine.getState().status).toBe('interrupted');
  });

  test('query 驱动工具执行并产出 done', async () => {
    const tool = createMockTool('query_patient', { id: 'P1' });
    const registry = new MedicalToolRegistry();
    registry.register(tool);

    const call: LoopToolUseBlock = {
      type: 'tool_use', id: 'c1', name: 'query_patient', input: { patientId: 'P1' },
    };
    const llm = new MockLLMClient([
      { toolCalls: [call] },
      { text: '已查询完成。' },
    ]);
    const engine = new QueryEngine({ registry, llm });

    let sawDone = false;
    for await (const ev of engine.query(
      { sessionId: 'sess_q2', user: createMockUser(), userInput: '查患者' },
      {
        audit: createMockAuditLogger(),
        permissionChecker: createMockPermissionChecker(),
        confirmation: createMockConfirmationCallbacks(),
        config: createMockConfig(),
      },
    )) {
      if (ev.type === 'done') sawDone = true;
    }
    expect(sawDone).toBe(true);
    expect(tool.callInputs).toHaveLength(1);
  });

  test('buildResponse 聚合结果', () => {
    const registry = new MedicalToolRegistry();
    const engine = new QueryEngine({ registry, llm: new MockLLMClient([]) });
    const resp = engine.buildResponse({
      requestId: 'r1',
      sessionId: 's1',
      output: 'ok',
      success: true,
      durationMs: 10,
    });
    expect(resp.success).toBe(true);
    expect(resp.output).toBe('ok');
  });
});
