/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import Anthropic, { type ClientOptions } from '@anthropic-ai/sdk';
import type {
  ContentBlockParam,
  MessageParam,
  RawMessageStreamEvent,
  Tool,
} from '@anthropic-ai/sdk/resources/messages/messages';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';

import type {
  LLMModelConfig,
  LLMRequestParams,
  LLMStreamEvent,
  LoopContentBlock,
  LoopMessage,
  LoopToolDefinition,
  LoopToolUseBlock,
  ModelAlias,
} from './loopTypes';

// ============================================================
// 模型配置
// ============================================================

/** 内置模型注册表 */
const BUILTIN_MODELS: Readonly<Record<ModelAlias, LLMModelConfig>> = {
  sonnet: {
    alias: 'sonnet',
    model: 'claude-sonnet-4-5-20250929',
    contextWindow: 200_000,
  },
  opus: {
    alias: 'opus',
    model: 'claude-opus-4-5-20251101',
    contextWindow: 200_000,
  },
  haiku: {
    alias: 'haiku',
    model: 'claude-haiku-4-5-20251001',
    contextWindow: 200_000,
  },
};

/**
 * LLM 客户端配置
 */
export interface LLMClientConfig {
  /** Anthropic API Key（生产环境从环境变量注入） */
  apiKey?: string;
  /** API Base URL（可指向国内代理或自建网关） */
  baseURL?: string;
  /** 默认模型别名（默认 sonnet） */
  defaultModel?: ModelAlias;
  /** 请求超时（毫秒，默认 120000） */
  timeoutMs?: number;
  /** 最大重试次数（默认 2，仅对可重试错误） */
  maxRetries?: number;
  /** 是否启用响应缓存（默认 true） */
  enableCache?: boolean;
  /** SDK 客户端额外选项 */
  clientOptions?: Partial<ClientOptions>;
}

/** 缓存条目 */
interface CacheEntry {
  /** 完整响应文本 */
  text: string;
  /** 工具调用 */
  toolCalls: LoopToolUseBlock[];
  /** Token 用量 */
  usage: { input: number; output: number };
}

/**
 * LLM 客户端接口（Provider 抽象）
 *
 * 抽象流式对话能力，默认实现为 Anthropic。
 * 国内大模型（通义/文心）可实现同一接口作为适配层注入，
 * 无需改动 Agent 主循环。
 */
export interface ILLMClient {
  /**
   * 流式对话
   *
   * @param params - 请求参数
   * @param modelAlias - 模型别名（默认使用配置默认模型）
   * @returns 流式事件异步生成器
   */
  streamChat(params: LLMRequestParams, modelAlias?: ModelAlias): AsyncGenerator<LLMStreamEvent>;

  /**
   * 获取模型配置
   *
   * @param alias - 模型别名
   * @returns 模型配置
   */
  getModel(alias: ModelAlias): LLMModelConfig;

  /**
   * 获取累计 Token 使用
   *
   * @returns 累计输入/输出 Token
   */
  getCumulativeUsage(): { input: number; output: number };
}

/**
 * Anthropic LLM 客户端
 *
 * 基于 @anthropic-ai/sdk 封装，提供：
 * - 多模型配置（Sonnet/Opus/Haiku）；
 * - SSE 流式响应处理；
 * - 失败重试与超时控制；
 * - Token 使用统计；
 * - 相同问题+相同上下文的响应缓存。
 *
 * @example
 * ```typescript
 * const llm = new LLMClient({ apiKey: process.env.ANTHROPIC_API_KEY });
 *
 * for await (const event of llm.streamChat({ system, messages, tools, maxTokens: 8192 })) {
 *   if (event.type === 'text_delta') process.stdout.write(event.text);
 * }
 * ```
 */
export class LLMClient implements ILLMClient {
  /** Anthropic SDK 客户端 */
  private readonly client: Anthropic;

  /** 配置 */
  private readonly config: {
    defaultModel: ModelAlias;
    timeoutMs: number;
    maxRetries: number;
    enableCache: boolean;
  };

  /** 响应缓存（key 由 system+messages+tools 摘要生成） */
  private readonly cache = new Map<string, CacheEntry>();

  /** 累计 Token 使用 */
  private cumulativeUsage = { input: 0, output: 0 };

  /**
   * 创建 LLM 客户端
   *
   * @param config - 客户端配置
   */
  constructor(config: LLMClientConfig = {}) {
    this.config = {
      defaultModel: config.defaultModel ?? 'sonnet',
      timeoutMs: config.timeoutMs ?? 120_000,
      maxRetries: config.maxRetries ?? 2,
      enableCache: config.enableCache ?? true,
    };

    this.client = new Anthropic({
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseURL ?? process.env.ANTHROPIC_BASE_URL,
      timeout: this.config.timeoutMs,
      maxRetries: 0, // 自行实现重试，便于医疗场景精确控制
      ...config.clientOptions,
    });
  }

  /**
   * 获取模型配置
   *
   * @param alias - 模型别名
   * @returns 模型配置
   */
  public getModel(alias: ModelAlias = this.config.defaultModel): LLMModelConfig {
    return BUILTIN_MODELS[alias];
  }

  /**
   * 流式对话
   *
   * 先查缓存；未命中则发起 SSE 流式请求，逐事件翻译为内部 LLMStreamEvent。
   * 遇到可重试错误（限流/连接/服务端错误）按 maxRetries 指数退避重试。
   *
   * @param params - 请求参数
   * @param modelAlias - 模型别名
   * @returns 流式事件异步生成器
   */
  public async *streamChat(
    params: LLMRequestParams,
    modelAlias: ModelAlias = this.config.defaultModel,
  ): AsyncGenerator<LLMStreamEvent> {
    const cacheKey = this.buildCacheKey(params, modelAlias);

    // 命中缓存：直接重放事件
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        yield* this.replayFromCache(cached);
        return;
      }
    }

    const model = this.getModel(modelAlias);
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = yield* this.streamOnce(params, model, cacheKey);
        this.cumulativeUsage.input += result.usage.input;
        this.cumulativeUsage.output += result.usage.output;
        return;
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error) || params.signal?.aborted) {
          break;
        }
        await this.sleep(500 * 2 ** attempt, params.signal);
      }
    }

    throw MedicalAgentError.from(lastError, ErrorCodes.EXTERNAL_SYSTEM_ERROR, {
      provider: 'anthropic',
      model: model.model,
    });
  }

  /**
   * 发起单次流式请求
   *
   * @param params - 请求参数
   * @param model - 模型配置
   * @param cacheKey - 缓存键
   * @returns 最终聚合用量（通过 yield 输出流式事件）
   */
  private async *streamOnce(
    params: LLMRequestParams,
    model: LLMModelConfig,
    cacheKey: string,
  ): AsyncGenerator<LLMStreamEvent, { usage: { input: number; output: number } }> {
    const requestParams = {
      model: model.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: this.toAnthropicMessages(params.messages),
      tools: this.toAnthropicTools(params.tools),
      temperature: params.temperature,
      stream: true as const,
    };

    const stream = this.client.messages.stream(requestParams, {
      signal: params.signal,
    });

    let text = '';
    const toolCalls: LoopToolUseBlock[] = [];
    const pendingTool = new Map<number, { id: string; name: string; json: string }>();
    let usage = { input: 0, output: 0 };
    let stopReason: string | null = null;

    yield { type: 'message_start', timestamp: Date.now() };

    for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
      switch (event.type) {
        case 'message_start': {
          usage = {
            input: event.message.usage?.input_tokens ?? 0,
            output: event.message.usage?.output_tokens ?? 0,
          };
          break;
        }
        case 'content_block_start': {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            pendingTool.set(event.index, {
              id: block.id,
              name: block.name,
              json: '',
            });
            yield {
              type: 'tool_use_start',
              id: block.id,
              name: block.name,
              timestamp: Date.now(),
            };
          }
          break;
        }
        case 'content_block_delta': {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            text += delta.text;
            yield { type: 'text_delta', text: delta.text, timestamp: Date.now() };
          } else if (delta.type === 'input_json_delta') {
            const pending = pendingTool.get(event.index);
            if (pending) {
              pending.json += delta.partial_json;
              yield {
                type: 'tool_use_input_delta',
                id: pending.id,
                partialJson: delta.partial_json,
                timestamp: Date.now(),
              };
            }
          }
          break;
        }
        case 'content_block_stop': {
          const pending = pendingTool.get(event.index);
          if (pending) {
            const input = this.safeParseToolInput(pending.json);
            toolCalls.push({
              type: 'tool_use',
              id: pending.id,
              name: pending.name,
              input,
            });
            pendingTool.delete(event.index);
            yield {
              type: 'tool_use_end',
              id: pending.id,
              input,
              timestamp: Date.now(),
            };
          }
          break;
        }
        case 'message_delta': {
          if (event.usage?.output_tokens != null) {
            usage.output = event.usage.output_tokens;
          }
          stopReason = event.delta?.stop_reason ?? stopReason;
          yield { type: 'message_delta', stopReason, timestamp: Date.now() };
          break;
        }
        case 'message_stop': {
          break;
        }
        // 注：本 SDK 版本的流错误以异常形式抛出并由上层 catch 处理，
        // RawMessageStreamEvent.type 联合中不含 'error'，故无需在此分支处理。
      }
    }

    if (this.config.enableCache) {
      this.cache.set(cacheKey, { text, toolCalls, usage });
    }

    yield {
      type: 'message_stop',
      usage,
      text,
      toolCalls,
      stopReason: stopReason ?? (toolCalls.length > 0 ? 'tool_use' : 'end_turn'),
      timestamp: Date.now(),
    };

    return { usage };
  }

  /**
   * 从缓存重放事件
   *
   * @param cached - 缓存条目
   */
  private async *replayFromCache(cached: CacheEntry): AsyncGenerator<LLMStreamEvent> {
    const ts = Date.now();
    yield { type: 'message_start', timestamp: ts };
    if (cached.text) {
      yield { type: 'text_delta', text: cached.text, timestamp: ts };
    }
    for (const call of cached.toolCalls) {
      yield { type: 'tool_use_start', id: call.id, name: call.name, timestamp: ts };
      yield { type: 'tool_use_end', id: call.id, input: call.input, timestamp: ts };
    }
    yield {
      type: 'message_stop',
      usage: cached.usage,
      text: cached.text,
      toolCalls: cached.toolCalls,
      stopReason: cached.toolCalls.length > 0 ? 'tool_use' : 'end_turn',
      timestamp: ts,
    };
  }

  /**
   * 获取累计 Token 使用
   *
   * @returns 累计输入/输出 Token
   */
  public getCumulativeUsage(): { input: number; output: number } {
    return { ...this.cumulativeUsage };
  }

  /** 清空响应缓存 */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 内部消息 → Anthropic MessageParam
   */
  private toAnthropicMessages(messages: readonly LoopMessage[]): MessageParam[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content.map((block) => this.toAnthropicBlock(block)),
    }));
  }

  /**
   * 内部内容块 → Anthropic 内容块参数
   */
  private toAnthropicBlock(block: LoopContentBlock): ContentBlockParam {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text };
      case 'tool_use':
        return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: block.toolUseId,
          content: block.content,
          is_error: block.isError ?? false,
        };
    }
  }

  /**
   * 内部工具定义 → Anthropic 工具参数
   */
  private toAnthropicTools(tools: readonly LoopToolDefinition[]): Tool[] | undefined {
    if (tools.length === 0) return undefined;
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Tool['input_schema'],
    }));
  }

  /**
   * 安全解析工具输入 JSON
   *
   * @param json - 累积的 JSON 字符串
   * @returns 解析后的对象
   */
  private safeParseToolInput(json: string): Record<string, unknown> {
    if (!json.trim()) return {};
    try {
      const parsed: unknown = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * 生成缓存键
   */
  private buildCacheKey(params: LLMRequestParams, modelAlias: ModelAlias): string {
    const basis = JSON.stringify({
      m: modelAlias,
      s: params.system,
      msgs: params.messages,
      tools: params.tools.map((t) => t.name),
    });
    let hash = 0;
    for (let i = 0; i < basis.length; i++) {
      hash = (hash << 5) - hash + basis.charCodeAt(i);
      hash |= 0;
    }
    return `llm_${Math.abs(hash).toString(36)}`;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof MedicalAgentError) {
      return error.code === ErrorCodes.EXTERNAL_SYSTEM_ERROR;
    }
    const name = (error as { name?: string })?.name ?? '';
    return (
      name === 'RateLimitError' ||
      name === 'APIConnectionError' ||
      name === 'InternalServerError' ||
      name === 'APIConnectionTimeoutError'
    );
  }

  /**
   * 可中断的退避等待
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      if (timer.unref) timer.unref();
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
