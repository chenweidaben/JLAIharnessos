/**
 * MEDMUSE 模型提供者 - 统一封装院内部署 LLM 的调用、重试、熔断与降级。
 *
 * 医疗安全：本层只负责报文转发，不做任何临床判断；输出统一带 confidence 与
 * disclaimer；上游不可用时 fail-open 到模板兜底（confidence=low），不阻塞会话。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** OpenAI chat/completions 消息结构（最小子集） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

/** 工具定义（OpenAI function calling 格式） */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type Confidence = 'high' | 'medium' | 'low';

export const DEFAULT_DISCLAIMER =
  '本建议由 AI 生成，不构成诊疗依据，最终决策由执业医师做出。';

/** 统一回复类型（全链路透传 confidence / disclaimer） */
export interface AgentReply {
  content: string;
  confidence: Confidence;
  disclaimer: string;
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  degraded: boolean;
}

export interface ModelProvider {
  chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<AgentReply>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenAI 兼容模型提供者。
 * - 单次请求超时 30s（AbortController）
 * - 失败重试 2 次，指数退避 200ms / 400ms
 * - 连续 3 次失败触发熔断，60 秒内直接降级到模板回复
 */
export class OpenAICompatibleModelProvider implements ModelProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  private failures = 0;
  private openedAt = 0;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    maxRetries?: number;
    failureThreshold?: number;
    cooldownMs?: number;
  }) {
    this.baseUrl = (options?.baseUrl ?? process.env.MEDMUSE_MODEL_BASE_URL ?? 'http://localhost:8000/v1').replace(/\/+$/, '');
    this.apiKey = options?.apiKey ?? process.env.MEDMUSE_MODEL_API_KEY ?? 'sk-local';
    this.model = options?.model ?? process.env.MEDMUSE_MODEL_NAME ?? 'qwen2.5-72b-instruct';
    this.timeoutMs = options?.timeoutMs ?? 30_000;
    this.maxRetries = options?.maxRetries ?? 2;
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.cooldownMs = options?.cooldownMs ?? 60_000;
  }

  private get breakerOpen(): boolean {
    if (this.failures < this.failureThreshold) return false;
    return Date.now() - this.openedAt < this.cooldownMs;
  }

  private recordSuccess(): void {
    this.failures = 0;
  }

  private recordFailure(): void {
    this.failures += 1;
    if (this.failures === this.failureThreshold) this.openedAt = Date.now();
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<AgentReply> {
    if (this.breakerOpen) {
      return fallbackReply('模型服务熔断中，已切换到本地辅助模式。');
    }
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const reply = await this.callOnce(messages, tools);
        this.recordSuccess();
        return reply;
      } catch (err) {
        lastErr = err;
        if (attempt < this.maxRetries) {
          await sleep(200 * Math.pow(2, attempt));
        }
      }
    }
    this.recordFailure();
    return fallbackReply(`模型服务暂不可用：${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  private async callOnce(messages: ChatMessage[], tools: ToolDefinition[]): Promise<AgentReply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`upstream ${resp.status}: ${text.slice(0, 200)}`);
      }
      const data = (await resp.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };
      const message = data.choices?.[0]?.message;
      const toolCalls = (message?.tool_calls ?? [])
        .map((tc) => {
          let args: Record<string, unknown> = {};
          try {
            args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
          } catch {
            args = { _raw: tc.function?.arguments ?? '' };
          }
          return { id: tc.id ?? `call_${Date.now()}`, name: tc.function?.name ?? '', args };
        })
        .filter((tc) => tc.name);
      return {
        content: message?.content ?? '',
        confidence: 'medium',
        disclaimer: DEFAULT_DISCLAIMER,
        toolCalls,
        degraded: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** 模板兜底：confidence=low，固定 disclaimer */
export class TemplateFallbackProvider implements ModelProvider {
  async chat(messages: ChatMessage[], _tools: ToolDefinition[]): Promise<AgentReply> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const echo = lastUser?.content ? `（已收到：${lastUser.content.slice(0, 60)}${lastUser.content.length > 60 ? '…' : ''}）` : '';
    return {
      content: `收到，我已记录您的需求。当前院内部署模型未连接，已切换到本地辅助模式。${echo}`,
      confidence: 'low',
      disclaimer: DEFAULT_DISCLAIMER,
      toolCalls: [],
      degraded: true,
    };
  }
}

function fallbackReply(prefix: string): AgentReply {
  return {
    content: `${prefix} 请稍后重试，或联系科主任智能体升级处理。`,
    confidence: 'low',
    disclaimer: DEFAULT_DISCLAIMER,
    toolCalls: [],
    degraded: true,
  };
}

let _cached: ModelProvider | null = null;

/** 工厂：显式配置 MEDMUSE_MODEL_BASE_URL 走 OpenAI 兼容；否则模板兜底。 */
export function getModelProvider(): ModelProvider {
  if (_cached) return _cached;
  const baseUrl = process.env.MEDMUSE_MODEL_BASE_URL;
  _cached = baseUrl
    ? new OpenAICompatibleModelProvider({ baseUrl })
    : new TemplateFallbackProvider();
  return _cached;
}

export function _resetModelProviderCache(): void {
  _cached = null;
}
