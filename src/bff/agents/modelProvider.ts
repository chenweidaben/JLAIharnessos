/**
 * MEDMUSE 模型提供者 - 统一封装院内部署 LLM/RADAR 推理的调用、重试、熔断与降级。
 *
 * 医疗安全：本层只负责报文转发，不做任何临床判断；输出统一带 confidence 与
 * disclaimer；上游不可用时 fail-open 到模板兜底（confidence=low），不阻塞会话。
 *
 * 生产加固：
 *  - 超时：AbortController 单次请求超时（默认 30s，TIMEOUT_MS 可配）；
 *  - 重试：指数退避 1s / 2s / 4s，最多 3 次（MAX_RETRIES 可配）；
 *  - 熔断：状态保存在模块级单例（进程内共享；重启丢失可接受），连续失败
 *    达到阈值后在冷却期内直接降级，不再打上游；
 *  - 降级：任何重试耗尽 / 熔断打开时返回模板 mock（confidence=low）。
 *
 * 端点 / 密钥 / 模型均从统一环境配置（config/env.ts）读取，不在代码中硬编码；
 * 模型信息接口（getModelInfo）绝不回传 apiKey。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getEnv } from '../config/env';

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

// ============================================================================
// 模块级熔断器单例（进程内共享；重启丢失可接受，但模块内唯一）
// ============================================================================

/** 熔断器内部可变状态（模块级单例） */
interface CircuitState {
  /** 连续失败次数（成功即清零） */
  failures: number;
  /** 达到阈值触发熔断的时间戳（0 = 从未熔断） */
  openedAt: number;
}

/** 模块级唯一熔断器状态实例 */
const circuitState: CircuitState = { failures: 0, openedAt: 0 };

/** 熔断器状态快照（供 /model-info 与单测使用） */
export interface CircuitStateSnapshot {
  /** closed = 正常放行；open = 冷却期内直接降级 */
  state: 'closed' | 'open';
  /** 当前连续失败次数 */
  failures: number;
  /** 熔断打开时间戳（0 = 当前未熔断） */
  openedAt: number;
}

/**
 * 判断熔断器当前是否处于打开状态。
 *
 * @param threshold 触发熔断的连续失败阈值
 * @param cooldownMs 熔断冷却时长（毫秒）
 */
function breakerOpen(threshold: number, cooldownMs: number): boolean {
  if (circuitState.failures < threshold) return false;
  return Date.now() - circuitState.openedAt < cooldownMs;
}

/** 记录一次成功：清零失败计数与熔断时间。 */
function recordSuccess(): void {
  circuitState.failures = 0;
  circuitState.openedAt = 0;
}

/**
 * 记录一次失败：累计失败次数；首次达到阈值时打熔断时间戳。
 *
 * @param threshold 触发熔断的连续失败阈值
 */
function recordFailure(threshold: number): void {
  circuitState.failures += 1;
  if (circuitState.failures === threshold) circuitState.openedAt = Date.now();
}

/**
 * 导出熔断器当前状态快照（使用默认阈值 3 次 / 冷却 60s 判定 open/closed）。
 * 只读，绝不包含任何密钥。
 */
export function getCircuitState(
  threshold = DEFAULT_FAILURE_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
): CircuitStateSnapshot {
  return {
    state: breakerOpen(threshold, cooldownMs) ? 'open' : 'closed',
    failures: circuitState.failures,
    openedAt: circuitState.openedAt,
  };
}

/** 测试专用：重置模块级熔断器状态。 */
export function _resetCircuitBreaker(): void {
  circuitState.failures = 0;
  circuitState.openedAt = 0;
}

// ============================================================================
// OpenAI 兼容（RADAR）模型提供者
// ============================================================================

/** 默认熔断阈值：连续失败 3 次触发 */
export const DEFAULT_FAILURE_THRESHOLD = 3;
/** 默认熔断冷却时长：60 秒 */
export const DEFAULT_COOLDOWN_MS = 60_000;
/** 指数退避基数（毫秒）：第 1/2/3 次重试前等待 1s / 2s / 4s */
export const DEFAULT_BACKOFF_BASE_MS = 1_000;

/**
 * OpenAI 兼容（院内部署 RADAR）模型提供者。
 * - 单次请求超时（AbortController，默认 30s）；
 * - 失败重试最多 3 次，指数退避 1s / 2s / 4s；
 * - 连续 3 次失败触发熔断，60 秒内直接降级到模板 mock（confidence=low）；
 * - 熔断状态为模块级单例，全进程共享。
 *
 * 端点 / 密钥 / 模型均从统一环境配置（config/env.ts）读取，不在代码中硬编码。
 */
export class OpenAICompatibleModelProvider implements ModelProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly backoffBaseMs: number;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    maxRetries?: number;
    failureThreshold?: number;
    cooldownMs?: number;
    /** 退避基数（毫秒），单测可置 0 加速；生产保持默认 1000 */
    backoffBaseMs?: number;
  }) {
    const cfg = getEnv();
    this.baseUrl = (options?.baseUrl ?? cfg.radarEndpoint).replace(/\/+$/, '');
    this.apiKey = options?.apiKey ?? cfg.radarApiKey;
    this.model = options?.model ?? cfg.radarModel;
    this.timeoutMs = options?.timeoutMs ?? cfg.timeoutMs;
    this.maxRetries = options?.maxRetries ?? cfg.maxRetries;
    this.failureThreshold = options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.backoffBaseMs = options?.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
  }

  /** 当前生效的超时（毫秒），供模型信息接口使用 */
  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  /** 当前配置的最大重试次数，供模型信息接口使用 */
  getMaxRetries(): number {
    return this.maxRetries;
  }

  /** 当前端点（已去尾部斜杠），供模型信息接口使用 */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** 当前模型名，供模型信息接口使用 */
  getModelName(): string {
    return this.model;
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<AgentReply> {
    // 熔断打开：冷却期内直接走模板兜底，不再打上游
    if (breakerOpen(this.failureThreshold, this.cooldownMs)) {
      return fallbackReply('模型服务熔断中，已切换到本地辅助模式。');
    }

    let lastErr: unknown = null;
    // 首次尝试 + 最多 maxRetries 次重试；重试前按 1s / 2s / 4s 指数退避
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const reply = await this.callOnce(messages, tools);
        recordSuccess();
        return reply;
      } catch (err) {
        lastErr = err;
        if (attempt < this.maxRetries) {
          await sleep(this.backoffBaseMs * 2 ** attempt);
        }
      }
    }

    recordFailure(this.failureThreshold);
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

/** 统一降级回复：confidence=low，标记 degraded。 */
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

/** 工厂：显式配置 LLM/RADAR 端点走 OpenAI 兼容；否则模板 mock 兜底。 */
export function getModelProvider(): ModelProvider {
  if (_cached) return _cached;
  const endpointSet = Boolean(
    process.env.RADAR_ENDPOINT ?? process.env.LLM_API_ENDPOINT ?? process.env.LLM_BASE_URL ?? process.env.MEDMUSE_MODEL_BASE_URL,
  );
  _cached = endpointSet
    ? new OpenAICompatibleModelProvider()
    : new TemplateFallbackProvider();
  return _cached;
}

export function _resetModelProviderCache(): void {
  _cached = null;
}

/**
 * 模型运行时信息（供 GET /api/v1/medmuse/model-info 对外暴露）。
 * 严禁包含 apiKey 等任何密钥字段。
 */
export interface ModelInfo {
  /** 推理端点（已去尾部斜杠） */
  endpoint: string;
  /** 模型名称 */
  model: string;
  /** 单次请求超时（毫秒） */
  timeoutMs: number;
  /** 最大重试次数（不含首次尝试） */
  maxRetries: number;
  /** 熔断器当前状态快照 */
  circuitState: CircuitStateSnapshot;
  /** 是否处于演示/降级模式（未接真实 LLM 或 DEMO_MODE） */
  demoMode: boolean;
}

/**
 * 汇总模型运行时信息（不含 apiKey）。
 *
 * - 真实 LLM 提供者激活时，字段取自该提供者实例与环境配置；
 * - 模板兜底激活时，endpoint/model 仍回显配置值，demoMode=true。
 */
export function getModelInfo(): ModelInfo {
  const cfg = getEnv();
  const provider = getModelProvider();
  const isReal = provider instanceof OpenAICompatibleModelProvider;
  return {
    endpoint: isReal ? provider.getBaseUrl() : cfg.radarEndpoint,
    model: isReal ? provider.getModelName() : cfg.radarModel,
    timeoutMs: isReal ? provider.getTimeoutMs() : cfg.timeoutMs,
    maxRetries: isReal ? provider.getMaxRetries() : cfg.maxRetries,
    circuitState: getCircuitState(),
    demoMode: cfg.demoMode || !isReal,
  };
}
