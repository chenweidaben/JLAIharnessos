/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * core 模块测试辅助 - Mock LLM 与工具
 */

import type { ILLMClient } from '@/core/agent/LLMClient';
import type {
  LLMRequestParams,
  LLMStreamEvent,
  LoopToolUseBlock,
  ModelAlias,
  LLMModelConfig,
} from '@/core/agent/loopTypes';
import type {
  BuiltMedicalTool,
  MedicalToolContext,
} from '@/types';
import { MedicalToolCategory } from '@/types';
import { buildMedicalTool } from '@/core/tools/buildMedicalTool';
import { z } from 'zod';

/** 单轮脚本响应 */
export interface ScriptedTurn {
  /** 流式文本增量 */
  text?: string;
  /** 工具调用 */
  toolCalls?: LoopToolUseBlock[];
}

/**
 * 脚本化 Mock LLM 客户端
 *
 * 按调用次数依次返回预设的多轮响应，用于驱动 Agent 主循环。
 */
export class MockLLMClient implements ILLMClient {
  /** 脚本化轮次 */
  private readonly turns: ScriptedTurn[];
  /** 调用计数 */
  public callCount = 0;
  /** 累计 Token */
  private usage = { input: 0, output: 0 };

  /**
   * @param turns - 预设轮次
   */
  constructor(turns: ScriptedTurn[]) {
    this.turns = turns;
  }

  public getModel(_alias: ModelAlias): LLMModelConfig {
    return { alias: 'haiku', model: 'mock', contextWindow: 200_000 };
  }

  public getCumulativeUsage(): { input: number; output: number } {
    return { ...this.usage };
  }

  public async *streamChat(
    _params: LLMRequestParams,
    _modelAlias?: ModelAlias,
  ): AsyncGenerator<LLMStreamEvent> {
    const turn = this.turns[this.callCount] ?? { text: '（无更多脚本响应）' };
    this.callCount++;
    const ts = Date.now();

    yield { type: 'message_start', timestamp: ts };

    if (turn.text) {
      yield { type: 'text_delta', text: turn.text, timestamp: ts };
    }

    for (const call of turn.toolCalls ?? []) {
      yield { type: 'tool_use_start', id: call.id, name: call.name, timestamp: ts };
      yield { type: 'tool_use_end', id: call.id, input: call.input, timestamp: ts };
    }

    const outTokens = (turn.text?.length ?? 0) + 10;
    this.usage.input += 500;
    this.usage.output += outTokens;

    yield {
      type: 'message_stop',
      usage: { input: 500, output: outTokens },
      text: turn.text ?? '',
      toolCalls: turn.toolCalls ?? [],
      stopReason: (turn.toolCalls?.length ?? 0) > 0 ? 'tool_use' : 'end_turn',
      timestamp: ts,
    };
  }
}

/**
 * 创建一个记录调用的只读 Mock 工具
 *
 * @param name - 工具名
 * @param result - 工具执行返回
 */
export function createMockTool(
  name: string,
  result: unknown = { ok: true },
): BuiltMedicalTool & { callInputs: Record<string, unknown>[] } {
  const callInputs: Record<string, unknown>[] = [];
  const tool = buildMedicalTool({
    name,
    description: `测试工具 ${name}`,
    category: MedicalToolCategory.PATIENT,
    riskLevel: 'low',
    requiresAuth: true,
    requiresConfirm: false,
    requiredPermissions: [],
    inputSchema: z.object({}).passthrough(),
    async execute(input: Record<string, unknown>, _ctx: MedicalToolContext) {
      callInputs.push(input);
      return result;
    },
  });
  return Object.assign(tool, { callInputs });
}
