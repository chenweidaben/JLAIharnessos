/**
 * 真实 LLM 适配层（M118-C）—— 统一院内大模型调用入口。
 *
 * 三种模式：
 *  - demo    ：演示/离线兜底模式，不发任何网络请求，返回本地模板回复；
 *  - openai  ：OpenAI 兼容协议（云端 / 自建网关），POST {LLM_API_URL}/chat/completions，
 *              携带 Authorization: Bearer {LLM_API_KEY}；
 *  - ollama  ：本地 Ollama / vLLM 推理服务（同样暴露 OpenAI 兼容 /v1 接口），
 *              无密钥时不发送 Authorization 头，适配内网裸部署。
 *
 * 自动降级：任何一次 chat 调用失败（网络错误 / 超时 / 非 2xx）都把适配器标记为
 * degraded，后续请求直接走 demo 模板回复，并通过 onWarning 记录告警；health()
 * 探测上游成功后自动解除降级。医疗业务严禁因外部大模型抖动而阻塞。
 *
 * 配置来源（环境变量，可在单测中以纯函数注入）：
 *  - LLM_PROVIDER : demo | openai | ollama（缺省 demo）
 *  - LLM_API_URL  : 推理服务 base URL（如 http://localhost:11434/v1）
 *  - LLM_API_KEY  : Bearer 密钥（本地 ollama 可留空）
 *  - LLM_MODEL    : 模型名（如 qwen2.5-72b-instruct）
 *
 * 依据宪法第三章：国家发展医疗卫生事业、保护人民健康，本层坚持"可降级、可观测、
 * 可审计"——上游不可用时 fail-open 到本地模板，绝不把临床对话卡死在网络调用上。
 *
 * 安全：status() 快照严禁回传 apiKey；日志与告警只记录非敏感信息。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 适配器运行模式 */
export type LLMProviderMode = 'demo' | 'openai' | 'ollama';

/** 对话消息（OpenAI chat messages 最小子集） */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** createLLMAdapter 的显式配置参数 */
export interface LLMAdapterConfig {
  /** 请求的提供方；传入非法值将抛错（配置错误须在启动期暴露） */
  provider?: string;
  /** 推理服务 base URL（自动去尾部斜杠） */
  apiUrl?: string;
  /** Bearer 密钥；ollama 本地部署可留空 */
  apiKey?: string;
  /** 模型名 */
  model?: string;
  /** 单次请求超时（毫秒），默认 15000 */
  timeoutMs?: number;
  /** 可注入的 fetch 实现（单测用），缺省全局 fetch */
  fetchImpl?: typeof fetch;
  /** 告警回调（单测可捕获），缺省 console.warn */
  onWarning?: (message: string) => void;
}

/** 单次 chat 结果 */
export interface LLMChatResult {
  /** 模型回复正文（demo 模式为模板文案） */
  content: string;
  /** 实际使用的模型名 */
  model: string;
  /** 实际生效模式（降级后可能与请求模式不同） */
  mode: LLMProviderMode;
  /** 是否走了降级/演示兜底 */
  degraded: boolean;
  /** token 用量（上游未返回时缺省） */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

/** 健康探测结果 */
export interface LLMHealth {
  healthy: boolean;
  checkedAt: string;
  error?: string;
}

/** 对外状态快照（绝不包含 apiKey） */
export interface LLMStatusSnapshot {
  /** 请求模式（配置解析后） */
  mode: LLMProviderMode;
  /** 原始请求的 LLM_PROVIDER 值（便于排查） */
  requestedProvider: string;
  /** 推理端点（不含密钥） */
  apiUrl: string;
  /** 模型名 */
  model: string;
  /** 最近一次健康探测结果；未探测过为 null */
  healthy: boolean | null;
  /** 当前是否处于运行时降级状态 */
  degraded: boolean;
  /** 累计告警条数 */
  warningCount: number;
  /** 最近若干条告警（不含敏感信息） */
  recentWarnings: string[];
}

/** 统一适配器接口 */
export interface LLMAdapter {
  /** 当前生效模式 */
  readonly mode: LLMProviderMode;
  /** 对话补全；上游失败自动降级为 demo 回复 */
  chat(messages: LLMMessage[], opts?: { temperature?: number }): Promise<LLMChatResult>;
  /** 探测上游 /models 端点；成功即解除降级 */
  health(): Promise<LLMHealth>;
  /** 导出运行状态快照（供 GET /api/v1/muse/llm/status） */
  status(): LLMStatusSnapshot;
}

// ============================================================================
// 纯函数：配置解析与校验
// ============================================================================

const VALID_MODES: readonly string[] = ['demo', 'openai', 'ollama'];
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RECENT_WARNINGS = 20;

/** 解析后的内部配置 */
interface ResolvedConfig {
  mode: LLMProviderMode;
  requestedProvider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  onWarning: (message: string) => void;
}

/**
 * 纯函数：从环境变量记录解析适配层配置。
 *
 * 校验规则：
 *  - LLM_PROVIDER 缺省为 demo；取值必须是 demo/openai/ollama 之一，否则抛错；
 *  - 选择 openai/ollama 但未提供 LLM_API_URL 时，自动降级为 demo 并记录告警
 *    （fail-open：不因配置缺失阻断启动）。
 *
 * @param env 环境变量键值记录（如 process.env 快照）
 */
export function parseLLMAdapterEnv(env: Record<string, string | undefined>): {
  config: Omit<ResolvedConfig, 'fetchImpl' | 'onWarning'>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const requestedProvider = (env.LLM_PROVIDER ?? 'demo').trim().toLowerCase() || 'demo';
  if (!VALID_MODES.includes(requestedProvider)) {
    throw new Error(
      `[llmAdapter] 非法 LLM_PROVIDER="${requestedProvider}"，合法值：demo | openai | ollama`,
    );
  }
  const rawUrl = (env.LLM_API_URL ?? '').trim();
  const apiUrl = rawUrl.replace(/\/+$/, '');
  const apiKey = (env.LLM_API_KEY ?? '').trim();
  const model = (env.LLM_MODEL ?? '').trim();
  const timeoutMs = toPositiveInt(env.LLM_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  let mode: LLMProviderMode = requestedProvider as LLMProviderMode;
  if (mode !== 'demo' && !apiUrl) {
    warnings.push(
      `LLM_PROVIDER=${mode} 但未配置 LLM_API_URL，自动降级为 demo 模式`,
    );
    mode = 'demo';
  }
  if (mode === 'openai' && !apiKey) {
    warnings.push('LLM_PROVIDER=openai 但未配置 LLM_API_KEY，部分网关会拒绝无鉴权请求');
  }
  if (mode !== 'demo' && !model) {
    warnings.push(`LLM_PROVIDER=${mode} 但未配置 LLM_MODEL，将使用上游默认模型`);
  }

  return { config: { mode, requestedProvider, apiUrl, apiKey, model, timeoutMs }, warnings };
}

function toPositiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// ============================================================================
// 工厂：createLLMAdapter（纯函数，无模块级隐式状态）
// ============================================================================

/**
 * 创建统一 LLM 适配器。
 *
 * @param config 显式配置；缺省时全部走环境变量语义（provider=demo 等）
 *
 * 示例：
 *   createLLMAdapter({ provider: 'openai', apiUrl: 'http://gw/v1', apiKey: 'sk-..', model: 'qwen' })
 *   createLLMAdapter()  // 等价 demo
 */
export function createLLMAdapter(config: LLMAdapterConfig = {}): LLMAdapter {
  // 把显式参数包装成 env 快照复用同一套校验逻辑，保证两条入口行为一致
  const env: Record<string, string | undefined> = {
    LLM_PROVIDER: config.provider,
    LLM_API_URL: config.apiUrl,
    LLM_API_KEY: config.apiKey,
    LLM_MODEL: config.model,
    LLM_TIMEOUT_MS: config.timeoutMs ? String(config.timeoutMs) : undefined,
  };
  const { config: parsed, warnings: bootWarnings } = parseLLMAdapterEnv(env);

  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const onWarning =
    config.onWarning ??
    ((m: string) => {
      // eslint-disable-next-line no-console
      console.warn(`[llmAdapter] ${m}`);
    });

  // ---- 适配器实例私有可变状态（闭包内，不污染模块级）----
  const recentWarnings: string[] = [];
  let warningCount = 0;
  let degraded = false;
  let healthy: boolean | null = null;
  let lastCheckedAt: string | null = null;

  const recordWarning = (msg: string) => {
    warningCount += 1;
    recentWarnings.push(msg);
    if (recentWarnings.length > MAX_RECENT_WARNINGS) recentWarnings.shift();
    onWarning(msg);
  };
  bootWarnings.forEach(recordWarning);

  // --------------------------------------------------------------------------
  // demo 兜底回复（fail-open）
  // --------------------------------------------------------------------------
  const demoReply = (messages: LLMMessage[], reason?: string): LLMChatResult => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const echo = lastUser?.content
      ? `（已收到：${lastUser.content.slice(0, 40)}${lastUser.content.length > 40 ? '…' : ''}）`
      : '';
    return {
      content: `${reason ? `【${reason}】` : ''}当前大模型服务不可用，已切换到本地辅助模式。${echo}`,
      model: parsed.model || 'local-demo',
      mode: 'demo',
      degraded: true,
    };
  };

  // --------------------------------------------------------------------------
  // 上游调用（OpenAI 兼容：openai 与 ollama/vLLM 共用 /chat/completions）
  // --------------------------------------------------------------------------
  const callUpstream = async (
    messages: LLMMessage[],
    temperature: number,
  ): Promise<LLMChatResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), parsed.timeoutMs);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      // ollama/vLLM 本地裸部署通常无鉴权；有 key 一律按 Bearer 发送
      if (parsed.apiKey) headers.authorization = `Bearer ${parsed.apiKey}`;
      const resp = await fetchImpl(`${parsed.apiUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: parsed.model || undefined,
          messages,
          temperature,
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`upstream HTTP ${resp.status}: ${text.slice(0, 160)}`);
      }
      const data = (await resp.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      return {
        content,
        model: data.model ?? parsed.model ?? 'unknown',
        mode: parsed.mode,
        degraded: false,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  // --------------------------------------------------------------------------
  // 对外接口
  // --------------------------------------------------------------------------
  return {
    get mode(): LLMProviderMode {
      return parsed.mode;
    },

    async chat(messages, opts): Promise<LLMChatResult> {
      if (parsed.mode === 'demo') return demoReply(messages, '演示模式');

      // 运行时已降级：在健康探测恢复前直接走本地模板，不再打上游
      if (degraded) return demoReply(messages, '模型服务降级中');

      try {
        const result = await callUpstream(messages, opts?.temperature ?? 0.2);
        degraded = false; // 恢复成功
        healthy = true;
        lastCheckedAt = new Date().toISOString();
        return result;
      } catch (err) {
        degraded = true;
        healthy = false;
        lastCheckedAt = new Date().toISOString();
        const reason = err instanceof Error ? err.message : String(err);
        recordWarning(`chat 调用失败，已降级 demo：${reason}`);
        return demoReply(messages, '模型服务暂不可用');
      }
    },

    async health(): Promise<LLMHealth> {
      const checkedAt = new Date().toISOString();
      lastCheckedAt = checkedAt;
      if (parsed.mode === 'demo') {
        healthy = true; // demo 模式永远"健康"（本地兜底可用）
        return { healthy: true, checkedAt };
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), parsed.timeoutMs);
      try {
        const headers: Record<string, string> = {};
        if (parsed.apiKey) headers.authorization = `Bearer ${parsed.apiKey}`;
        const resp = await fetchImpl(`${parsed.apiUrl}/models`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`GET /models HTTP ${resp.status}`);
        healthy = true;
        if (degraded) {
          degraded = false;
          recordWarning('健康探测成功，已自动解除降级');
        }
        return { healthy: true, checkedAt };
      } catch (err) {
        healthy = false;
        degraded = true;
        const reason = err instanceof Error ? err.message : String(err);
        recordWarning(`健康探测失败：${reason}`);
        return { healthy: false, checkedAt, error: reason };
      } finally {
        clearTimeout(timer);
      }
    },

    status(): LLMStatusSnapshot {
      return {
        mode: parsed.mode,
        requestedProvider: parsed.requestedProvider,
        apiUrl: parsed.apiUrl,
        model: parsed.model,
        healthy,
        degraded,
        warningCount,
        recentWarnings: [...recentWarnings],
      };
    },
  };
}

// ============================================================================
// 进程级单例（供 BFF 路由取用；测试可 reset）
// ============================================================================

let _singleton: LLMAdapter | null = null;

/** 从 process.env 创建（或复用）进程级单例适配器 */
export function getLLMAdapter(): LLMAdapter {
  if (_singleton) return _singleton;
  _singleton = createLLMAdapter({
    provider: process.env.LLM_PROVIDER,
    apiUrl: process.env.LLM_API_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
  });
  return _singleton;
}

/** 测试专用：重置单例 */
export function _resetLLMAdapterSingleton(): void {
  _singleton = null;
}
