/**
 * 健澜科技杠OS - 核心 LLM 客户端适配器
 *
 * 将 core/agent/LLMClient（ILLMClient，基于流式 AsyncGenerator 的 Provider 抽象）
 * 适配为编排层的 IWorkflowLlm（一次性 complete 语义）。编排层消费完整结果，
 * 流式细节在此聚合：拼接 text_delta、在 message_stop 取 token 用量。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { ILLMClient } from '../../core/agent/LLMClient.js';
import type { LoopMessage, ModelAlias } from '../../core/agent/loopTypes.js';
import type { IWorkflowLlm, LlmRequest, LlmResponse } from '../engine/runtime.js';

/** 编排层模型名 -> 核心模型别名映射 */
const MODEL_ALIAS_MAP: Record<string, ModelAlias> = {
  sonnet: 'sonnet',
  opus: 'opus',
  haiku: 'haiku',
  'claude-sonnet': 'sonnet',
  'claude-opus': 'opus',
  'claude-haiku': 'haiku',
};

/** 将任意模型标识解析为核心支持的别名（缺省 sonnet） */
export function resolveModelAlias(model: string): ModelAlias {
  return MODEL_ALIAS_MAP[model] ?? 'sonnet';
}

/**
 * 核心 LLM 客户端 -> 编排层 LLM 适配器
 */
export class CoreLlmAdapter implements IWorkflowLlm {
  constructor(private readonly client: ILLMClient) {}

  async complete(req: LlmRequest): Promise<LlmResponse> {
    // 合并 system 消息
    const systemParts = req.messages.filter((m) => m.role === 'system').map((m) => m.content);
    const system = systemParts.join('\n\n');

    // user/assistant 消息转为核心 LoopMessage（文本块）
    const messages: LoopMessage[] = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: [{ type: 'text' as const, text: m.content }],
      }));

    const alias = resolveModelAlias(req.model);
    let text = '';
    let usage = { input: 0, output: 0 };
    let stopReason: string | null = null;

    for await (const event of this.client.streamChat(
      {
        system,
        messages,
        tools: [],
        maxTokens: req.maxTokens ?? 4096,
        temperature: req.temperature,
      },
      alias,
    )) {
      switch (event.type) {
        case 'text_delta':
          text += event.text;
          break;
        case 'message_stop':
          text = event.text || text;
          usage = event.usage ?? usage;
          stopReason = event.stopReason;
          break;
        case 'message_delta':
          stopReason = event.stopReason ?? stopReason;
          break;
        default:
          break;
      }
    }

    let json: unknown;
    if (req.jsonMode) {
      try {
        const s = text.indexOf('{');
        const e = text.lastIndexOf('}');
        if (s >= 0 && e > s) json = JSON.parse(text.slice(s, e + 1));
      } catch {
        json = undefined;
      }
    }

    return {
      text,
      json,
      tokens: usage,
      finishReason: stopReason === 'max_tokens' ? 'length' : stopReason === 'error' ? 'error' : 'stop',
    };
  }
}
