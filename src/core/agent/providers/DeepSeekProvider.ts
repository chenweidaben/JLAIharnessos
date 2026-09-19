/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * DeepSeek Provider（OpenAI Chat Completions 兼容 + SSE 流式）
 *
 * 实现 core/agent/LLMClient.ts 定义的 ILLMClient 抽象接口，
 * 使国内大模型（DeepSeek）可在不改动 Agent 主循环的前提下注入。
 *
 * 设计要点：
 * - 消息映射：内部 LoopMessage/LoopContentBlock -> OpenAI messages；
 *   tool_use -> assistant 的 tool_calls；tool_result -> role:'tool' 并带 tool_call_id。
 * - 工具调用：LoopToolDefinition -> OpenAI tools；逐 chunk 累积 tool_calls 分片
 *   （index/id/function.name/function.arguments），翻译为 tool_use_start/input_delta/end。
 * - 模型别名映射：sonnet/haiku -> LLM_MODEL（deepseek-chat）；opus -> LLM_REASONING_MODEL。
 * - 用量：解析 SSE usage（prompt_tokens/completion_tokens）并累计。
 * - 超时与重试：AbortController 实现超时；对 429/5xx/网络错误做指数退避有限重试，abort 不重试。
 *
 * 安全红线：API Key 仅从 process.env 读取，严禁硬编码。
 */

import { ErrorCodes, MedicalAgentError } from '@/core/errors';

import type {
  LLMModelConfig,
  LLMRequestParams,
  LLMStreamEvent,
  LoopMessage,
  LoopToolDefinition,
  LoopToolUseBlock,
  ModelAlias,
} from '../loopTypes';

// ============================================================
// OpenAI Chat Completions 兼容请求/响应类型（最小子集）
// ============================================================

/** OpenAI 工具定义 */
interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

/** OpenAI 对话消息 */
interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

/** SSE 流式 chunk 中的增量 tool_call */
interface OpenAiToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

/** SSE 流式 chunk 选项 */
interface OpenAiChoiceDelta {
  role?: string;
  content?: string | null;
  tool_calls?: OpenAiToolCallDelta[];
}

/** SSE 流式 chunk */
interface OpenAiChunk {
  choices?: Array<{
    delta?: OpenAiChoiceDelta;
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** 单次累积中的工具调用 */
interface PendingToolCall {
  id: string;
  name: string;
  /** arguments 分片累积的 JSON 字符串 */
  args: string;
}

// ============================================================
// Provider 配置
// ============================================================

/** DeepSeek Provider 配置 */
export interface DeepSeekProviderConfig {
  /** API Key（默认读 process.env.LLM_API_KEY） */
  apiKey?: string;
  /** Base URL（默认读 process.env.LLM_BASE_URL，https://api.deepseek.com/v1） */
  baseURL?: string;
  /** 轻量/对话模型（默认读 process.env.LLM_MODEL，deepseek-chat） */
  chatModel?: string;
  /** 推理模型（默认读 process.env.LLM_REASONING_MODEL，deepseek-reasoner） */
  reasoningModel?: string;
  /** 请求超时（毫秒，默认读 process.env.LLM_TIMEOUT_MS 或 120000） */
  timeoutMs?: number;
  /** 最大重试次数（默认 2） */
  maxRetries?: number;
  /** 默认模型别名（默认 sonnet） */
  defaultModel?: ModelAlias;
  /** 可注入的 fetch（测试用；默认全局 fetch） */
  fetchImpl?: typeof fetch;
}

/** 上下文窗口（DeepSeek 实际为 64K 有效输出窗口，保守取 64000） */
const DEFAULT_CONTEXT_WINDOW = 64_000;

/**
 * DeepSeek LLM 客户端
 *
 * 与 Anthropic LLMClient 实现同一 ILLMClient 接口，可无缝替换注入 Agent 主循环。
 */
export class DeepSeekProvider {
  private readonly config: {
    apiKey: string | undefined;
    baseURL: string | undefined;
    chatModel: string;
    reasoningModel: string;
    timeoutMs: number;
    maxRetries: number;
    defaultModel: ModelAlias;
  };

  private readonly fetchImpl: typeof fetch;

  /** 累计 Token 使用 */
  private cumulativeUsage = { input: 0, output: 0 };

  /**
   * 创建 DeepSeek Provider
   *
   * @param config - 配置（API Key 等敏感项缺省从 process.env 读取）
   */
  constructor(config: DeepSeekProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.LLM_API_KEY,
      baseURL: config.baseURL ?? process.env.LLM_BASE_URL,
      chatModel: config.chatModel ?? process.env.LLM_MODEL ?? 'deepseek-chat',
      reasoningModel:
        config.reasoningModel ?? process.env.LLM_REASONING_MODEL ?? 'deepseek-reasoner',
      timeoutMs: config.timeoutMs ?? (Number(process.env.LLM_TIMEOUT_MS) || 120_000),
      maxRetries: config.maxRetries ?? 2,
      defaultModel: config.defaultModel ?? 'sonnet',
    };
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  /**
   * 获取模型配置
   *
   * @param alias - 模型别名
   * @returns 模型配置（alias 保持为合法 ModelAlias）
   */
  public getModel(alias: ModelAlias = this.config.defaultModel): LLMModelConfig {
    return {
      alias,
      model: alias === 'opus' ? this.config.reasoningModel : this.config.chatModel,
      contextWindow: DEFAULT_CONTEXT_WINDOW,
    };
  }

  /**
   * 获取累计 Token 使用
   *
   * @returns 累计输入/输出 Token（副本）
   */
  public getCumulativeUsage(): { input: number; output: number } {
    return { ...this.cumulativeUsage };
  }

  /**
   * 流式对话（实现 ILLMClient.streamChat）
   *
   * 对可重试错误（429/5xx/网络错误）按指数退避重试；abort 不重试。
   *
   * @param params - 请求参数
   * @param modelAlias - 模型别名
   * @returns 流式事件异步生成器
   */
  public async *streamChat(
    params: LLMRequestParams,
    modelAlias: ModelAlias = this.config.defaultModel,
  ): AsyncGenerator<LLMStreamEvent> {
    const model = this.getModel(modelAlias);
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = yield* this.streamOnce(params, model);
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
      provider: 'deepseek',
      model: model.model,
    });
  }

  // ------------------------------------------------------------
  // 单次流式请求
  // ------------------------------------------------------------

  private async *streamOnce(
    params: LLMRequestParams,
    model: LLMModelConfig,
  ): AsyncGenerator<LLMStreamEvent, { usage: { input: number; output: number } }> {
    if (!this.config.apiKey) {
      throw new MedicalAgentError(
        ErrorCodes.UNAUTHENTICATED,
        '未配置 DeepSeek API Key（请设置环境变量 LLM_API_KEY）',
        { provider: 'deepseek' },
      );
    }
    const baseURL = (this.config.baseURL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');

    const body = JSON.stringify({
      model: model.model,
      messages: this.toOpenAiMessages(params.system, params.messages),
      tools: this.toOpenAiTools(params.tools),
      tool_choice: params.tools.length > 0 ? 'auto' : undefined,
      temperature: params.temperature ?? (Number(process.env.LLM_TEMPERATURE) || 0.2),
      max_tokens: params.maxTokens,
      stream: true,
      // 要求在流末尾携带 usage
      stream_options: { include_usage: true },
    });

    // 合并外部 signal 与超时 AbortController
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), this.config.timeoutMs);
    if (timer.unref) timer.unref();
    const onExternalAbort = (): void => timeoutController.abort();
    params.signal?.addEventListener('abort', onExternalAbort, { once: true });

    let response: Response;
    try {
      response = await this.fetchImpl(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body,
        signal: timeoutController.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onExternalAbort);
      throw error;
    }

    if (!response.ok) {
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onExternalAbort);
      const text = await response.text().catch(() => '');
      const err = new MedicalAgentError(
        ErrorCodes.EXTERNAL_SYSTEM_ERROR,
        `DeepSeek API 错误 ${response.status}: ${text.slice(0, 500)}`,
        { provider: 'deepseek', status: response.status },
      );
      // 挂标记供 isRetryable 判定
      (err as unknown as { httpStatus: number }).httpStatus = response.status;
      throw err;
    }

    let text = '';
    let usage = { input: 0, output: 0 };
    let stopReason: string | null = null;
    const toolCalls: LoopToolUseBlock[] = [];
    const pendingTools = new Map<number, PendingToolCall>();
    const startedToolIds = new Set<string>();

    yield { type: 'message_start', timestamp: Date.now() };

    try {
      const decoder = new TextDecoder();
      let buffer = '';
      // processLine 为普通函数，不能 yield；收集事件后由外层 generator 统一产出
      const events: LLMStreamEvent[] = [];

      const processLine = (rawLine: string): void => {
        const line = rawLine.trim();
        if (!line) return;
        if (!line.startsWith('data:')) return;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        let chunk: OpenAiChunk;
        try {
          chunk = JSON.parse(payload) as OpenAiChunk;
        } catch {
          return;
        }

        if (chunk.usage) {
          usage = {
            input: chunk.usage.prompt_tokens ?? usage.input,
            output: chunk.usage.completion_tokens ?? usage.output,
          };
        }

        const choice = chunk.choices?.[0];
        if (!choice) return;

        if (choice.finish_reason) {
          stopReason = choice.finish_reason;
        }

        const delta = choice.delta;
        if (delta) {
          if (typeof delta.content === 'string' && delta.content.length > 0) {
            text += delta.content;
            events.push({
              type: 'text_delta',
              text: delta.content,
              timestamp: Date.now(),
            });
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              let pending = pendingTools.get(idx);
              if (!pending) {
                pending = { id: tc.id ?? '', name: '', args: '' };
                pendingTools.set(idx, pending);
              }
              if (tc.id) pending.id = tc.id;
              if (tc.function?.name) pending.name = tc.function.name;

              // 首次出现且已知 id/name -> 触发 tool_use_start
              if (pending.id && pending.name && !startedToolIds.has(pending.id)) {
                startedToolIds.add(pending.id);
                events.push({
                  type: 'tool_use_start',
                  id: pending.id,
                  name: pending.name,
                  timestamp: Date.now(),
                });
              }

              if (tc.function?.arguments) {
                pending.args += tc.function.arguments;
                events.push({
                  type: 'tool_use_input_delta',
                  id: pending.id,
                  partialJson: tc.function.arguments,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      };

      if (response.body) {
        const reader = response.body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            // SSE 以 \n 分隔事件；按行切分，残片留在 buffer
            while ((nl = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              processLine(line);
              // 边读边产出已收集事件，保持流式语义
              while (events.length > 0) yield events.shift()!;
            }
          }
          // 收尾处理 buffer 中残余行
          if (buffer.trim()) processLine(buffer);
          while (events.length > 0) yield events.shift()!;
        } finally {
          reader.releaseLock();
        }
      }
    } finally {
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onExternalAbort);
    }

    // 结束所有进行中的工具调用
    for (const pending of pendingTools.values()) {
      const input = this.safeParseToolInput(pending.args);
      toolCalls.push({
        type: 'tool_use',
        id: pending.id,
        name: pending.name,
        input,
      });
      yield {
        type: 'tool_use_end',
        id: pending.id,
        input,
        timestamp: Date.now(),
      };
    }

    yield { type: 'message_delta', stopReason, timestamp: Date.now() };

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

  // ------------------------------------------------------------
  // 内部结构 -> OpenAI 格式
  // ------------------------------------------------------------

  /** 系统提示词 + 对话消息 -> OpenAI messages */
  private toOpenAiMessages(system: string, messages: readonly LoopMessage[]): OpenAiMessage[] {
    const out: OpenAiMessage[] = [];
    if (system.trim()) {
      out.push({ role: 'system', content: system });
    }
    for (const m of messages) {
      out.push(...this.toOpenAiFromLoopMessage(m));
    }
    return out;
  }

  /** 单条内部消息 -> 可能多条 OpenAI 消息（tool_result 展开为 tool 角色消息） */
  private toOpenAiFromLoopMessage(m: LoopMessage): OpenAiMessage[] {
    const out: OpenAiMessage[] = [];

    const textParts: string[] = [];
    const toolCalls: NonNullable<OpenAiMessage['tool_calls']> = [];

    for (const block of m.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
        });
      } else {
        out.push({
          role: 'tool',
          tool_call_id: block.toolUseId,
          content: block.content,
        });
      }
    }

    // assistant 消息（含文本与 tool_calls）合并为一条
    if (m.role === 'assistant' && (textParts.length > 0 || toolCalls.length > 0)) {
      out.push({
        role: 'assistant',
        content: textParts.length > 0 ? textParts.join('') : null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
    } else if (m.role === 'user' && textParts.length > 0) {
      out.push({ role: 'user', content: textParts.join('') });
    }

    return out;
  }

  /** 内部工具定义 -> OpenAI tools */
  private toOpenAiTools(tools: readonly LoopToolDefinition[]): OpenAiTool[] | undefined {
    if (tools.length === 0) return undefined;
    return tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  // ------------------------------------------------------------
  // 工具方法
  // ------------------------------------------------------------

  /** 安全解析工具输入 JSON */
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

  /** 判断错误是否可重试：429、5xx、网络/超时错误 */
  private isRetryable(error: unknown): boolean {
    if (error instanceof MedicalAgentError) {
      const status = (error as unknown as { httpStatus?: number }).httpStatus;
      if (status != null) {
        return status === 429 || status >= 500;
      }
      // 网络/Abort 类错误由 name/stack 启发式判定
      const name = error.name ?? '';
      return (
        name === 'TimeoutError' ||
        name === 'AbortError' ||
        /network|fetch|timeout|ECONNRESET|ECONNREFUSED/i.test(error.message)
      );
    }
    const name = (error as { name?: string })?.name ?? '';
    return (
      name === 'AbortError' ||
      name === 'TimeoutError' ||
      /network|fetch|timeout|ECONNRESET|ECONNREFUSED/i.test(
        (error as { message?: string })?.message ?? '',
      )
    );
  }

  /** 可中断的退避等待 */
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
