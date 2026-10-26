/**
 * 健澜科技 jlmedaios - 真实 LLM 客户端聚合器（M131-C，AI能力深化）。
 *
 * 【AI能力深化】面向临床场景的统一大模型对话入口：
 *  - callRealLLM(prompt, context, options)：按配置选择 OpenAI GPT-4 / 通义千问 /
 *    本地 Ollama 三种后端之一发起对话补全，带超时、指数退避重试与 fail-open 降级；
 *  - buildMedicalSystemPrompt()：生成院内医疗助手专属 system prompt（安全红线内置）；
 *  - manageContextWindow(messages, maxTokens)：纯函数式上下文窗口裁剪，永远保留
 *    system 消息，超出预算时从最旧的历史消息开始丢弃。
 *
 * 模型切换（配置驱动，不硬编码真实密钥；生产由环境变量/部署注入）：
 *  - openai ：OpenAI GPT-4 系列，POST https://api.openai.com/v1/chat/completions，
 *             携带 Authorization: Bearer {apiKey}；
 *  - qwen  ：通义千问（阿里云 DashScope OpenAI 兼容模式），同样是
 *             /chat/completions + Bearer；
 *  - ollama：本地 Ollama / vLLM 裸部署（内网无鉴权），缺省不带 Authorization 头；
 *  - demo  ：未配置任何上游时的本地模板兜底，不发任何网络请求。
 *
 * 生产级约束：
 *  - 超时：AbortController 单次请求强制中断（默认 20s），绝不把临床请求挂死；
 *  - 重试：指数退避（默认基数 300ms，可注入 0 加速单测），耗尽后降级本地模板；
 *  - 降级：任何失败都返回 degraded=true 的兜底回复，系统永不阻塞、永不 502 给前端；
 *  - 医疗安全：所有回复统一携带免责声明，不构成诊疗依据。
 *
 * 依据宪法第三章：发展医疗卫生事业、保护人民健康——AI 只做辅助，决策权在执业医师。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 支持的模型后端（配置切换，生产不实际硬编码调用任何一家） */
export type LLMClientProvider = 'openai' | 'qwen' | 'ollama' | 'demo';

/** 对话消息（OpenAI chat messages 最小子集，与 llmAdapter 口径一致） */
export interface LLMClientMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 随对话带入的院内上下文（已在更上层完成脱敏，本层不接触明文患者标识） */
export interface MedicalContext {
  /** 患者摘要（脱敏后的主诉/诊断/检验要点） */
  patientSummary?: string;
  /** 科室编码 */
  deptCode?: string;
  /** 提问人岗位角色（医生/护士/药师…） */
  staffRole?: string;
  /** 附加备注 */
  extraNotes?: string;
}

/** callRealLLM 的可调选项（全部可注入，单测友好） */
export interface CallRealLLMOptions {
  /** 模型后端；缺省读 JL_LLM_PROVIDER，再缺省 demo */
  provider?: string;
  /** 推理服务 base URL（缺省按 provider 取默认值） */
  apiUrl?: string;
  /** Bearer 密钥（ollama 本地裸部署可留空） */
  apiKey?: string;
  /** 模型名（缺省按 provider 取默认值） */
  model?: string;
  /** 单次请求超时（毫秒），默认 20000 */
  timeoutMs?: number;
  /** 失败重试次数（不含首次尝试），默认 2；指数退避 */
  maxRetries?: number;
  /** 退避基数（毫秒），默认 300；单测可置 0 */
  backoffBaseMs?: number;
  /** 采样温度，默认 0.2（医疗场景偏保守） */
  temperature?: number;
  /** 上下文窗口 token 预算，默认 6000 */
  maxContextTokens?: number;
  /** 多轮历史消息（不含 system） */
  history?: LLMClientMessage[];
  /** 可注入的 fetch 实现（单测用），缺省全局 fetch */
  fetchImpl?: typeof fetch;
  /** 告警回调（单测可捕获），缺省 console.warn */
  onWarning?: (message: string) => void;
}

/** 统一回复结构（全链路透传降级标记与免责声明） */
export interface LLMResponse {
  /** 模型回复正文（降级时为本地模板文案） */
  content: string;
  /** 实际使用的模型名 */
  model: string;
  /** 实际生效的后端 */
  provider: LLMClientProvider;
  /** 是否走了降级/演示兜底 */
  degraded: boolean;
  /** 结束原因：stop=上游正常完成；degraded=重试耗尽/超时/未配置上游 */
  finishReason: 'stop' | 'degraded';
  /** token 用量（上游未返回时缺省） */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  /** 固定医疗免责声明 */
  disclaimer: string;
}

/** 各 provider 的内置默认值（生产由环境变量覆盖，严禁在此填写真实密钥） */
const PROVIDER_PRESETS: Record<
  Exclude<LLMClientProvider, 'demo'>,
  { defaultApiUrl: string; defaultModel: string; needsAuth: boolean }
> = {
  // OpenAI GPT-4 系列
  openai: { defaultApiUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', needsAuth: true },
  // 通义千问（DashScope OpenAI 兼容模式）
  qwen: { defaultApiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', needsAuth: true },
  // 本地 Ollama / vLLM 内网裸部署
  ollama: { defaultApiUrl: 'http://127.0.0.1:11434/v1', defaultModel: 'qwen2.5', needsAuth: false },
};

/** 默认单次请求超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 20_000;
/** 默认失败重试次数（不含首次尝试） */
const DEFAULT_MAX_RETRIES = 2;
/** 默认退避基数（毫秒） */
const DEFAULT_BACKOFF_BASE_MS = 300;
/** 默认上下文窗口 token 预算 */
const DEFAULT_MAX_CONTEXT_TOKENS = 6_000;

/** 固定医疗免责声明（与全院 AI 输出口径一致） */
export const MEDICAL_DISCLAIMER = '本内容由 AI 生成，仅供临床参考，不构成诊疗依据；最终决策由执业医师做出。';

// ============================================================================
// 纯函数一：buildMedicalSystemPrompt
// ============================================================================

/**
 * 【AI能力深化】构建院内医疗助手 system prompt。
 *
 * 内置安全红线：循证优先、不确定明说、不泄露隐私、输出固定免责提示。
 * 无参数、无副作用，纯字符串组装——单测可对快照做断言。
 */
export function buildMedicalSystemPrompt(): string {
  return [
    '你是健澜科技平台内置的医疗 AI 助手，服务对象为执业医师、护士与药师。',
    '',
    '【角色定位】你是临床决策的辅助参谋，不是决策者。你提供的所有内容均为参考信息。',
    '【安全红线】',
    '1. 不得替代执业医师做出诊断、开具处方或下达医嘱；',
    '2. 严格遵循循证医学原则，优先引用权威指南与教材口径；不确定时必须明确说明「证据不足，建议复核」；',
    '3. 涉及危急值、过敏史、药物相互作用等高风险信息时，必须显式提醒人工复核；',
    '4. 不得编造患者隐私数据；对输入中的患者信息仅做上下文参考，不得向外泄露；',
    '5. 回答末尾自然附上提示：AI 生成内容仅供参考，诊疗决策以主管医师判断为准。',
    '【表达要求】使用规范中文医学术语；先给结论，再列要点；结构清晰、可直接用于临床沟通。',
  ].join('\n');
}

// ============================================================================
// 纯函数二：manageContextWindow（含 token 估算）
// ============================================================================

/**
 * 粗略估算文本 token 数：中日韩全角字符按 1 token 计，ASCII 按 0.3 token 计。
 * 真实分词以上游 tokenizer 为准，此处仅用于上下文窗口预算控制，宁紧勿松。
 */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const ch of text) {
    tokens += /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/.test(ch) ? 1 : 0.3;
  }
  return Math.ceil(tokens);
}

/**
 * 【AI能力深化】上下文窗口裁剪：在 maxTokens 预算内保留尽可能新的对话。
 *
 * 规则：
 *  - system 消息永远完整保留（系统提示不可裁剪）；
 *  - 非 system 消息从最旧开始丢弃，直到总量回到预算内；
 *  - 若仅剩最新一条仍超预算，则把该条内容尾部截断到预算内，保证结构完整；
 *  - 纯函数：不修改入参，返回新数组。
 *
 * @param messages 原始消息序列（含 system）
 * @param maxTokens token 预算；<=0 时按默认预算处理
 */
export function manageContextWindow(
  messages: LLMClientMessage[],
  maxTokens: number,
): LLMClientMessage[] {
  const budget = Number.isInteger(maxTokens) && maxTokens > 0 ? maxTokens : DEFAULT_MAX_CONTEXT_TOKENS;

  const systemMsgs = messages.filter((m) => m.role === 'system');
  const convo = messages.filter((m) => m.role !== 'system');
  const systemTokens = systemMsgs.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  let remaining = budget - systemTokens;

  if (remaining <= 0) {
    // 系统提示本身已超预算：原样返回（上游会按自己的策略处理，本层不截断系统提示）
    return [...systemMsgs];
  }

  // 从最新消息向前贪心保留
  const kept: LLMClientMessage[] = [];
  for (let i = convo.length - 1; i >= 0; i -= 1) {
    const t = estimateTokens(convo[i].content);
    if (t <= remaining) {
      kept.unshift(convo[i]);
      remaining -= t;
    } else {
      break;
    }
  }

  // 至少保留最新一条用户消息：若上面一条都没留下且对话非空，硬塞最新一条并截断
  if (kept.length === 0 && convo.length > 0) {
    const last = convo[convo.length - 1];
    const maxChars = Math.max(1, Math.floor(remaining / 0.3));
    const truncated: LLMClientMessage = { ...last, content: last.content.slice(0, maxChars) };
    kept.push(truncated);
  }

  return [...systemMsgs, ...kept];
}

// ============================================================================
// 纯函数三：callRealLLM
// ============================================================================

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 解析 provider 字符串；非法值回退 demo（配置错误 fail-open，不抛死启动） */
function resolveProvider(raw: string | undefined): LLMClientProvider {
  const v = (raw ?? process.env.JL_LLM_PROVIDER ?? 'demo').trim().toLowerCase();
  if (v === 'openai' || v === 'gpt4' || v === 'gpt-4') return 'openai';
  if (v === 'qwen' || v === 'tongyi' || v === 'qianwen') return 'qwen';
  if (v === 'ollama' || v === 'local') return 'ollama';
  return 'demo';
}

/** 组装降级兜底回复（fail-open：绝不把临床对话卡死在网络调用上） */
function degradedReply(prompt: string, provider: LLMClientProvider, model: string, reason: string): LLMResponse {
  const head = prompt.length > 40 ? `${prompt.slice(0, 40)}…` : prompt;
  return {
    content: `【${reason}】当前大模型服务暂不可用，已切换本地辅助模式。\n（已收到您的问题：${head}）\n请稍后重试，或联系信息科确认推理服务状态。`,
    model,
    provider,
    degraded: true,
    finishReason: 'degraded',
    disclaimer: MEDICAL_DISCLAIMER,
  };
}

/** 把院内上下文拼接到用户提问后，形成最终 user 消息 */
function buildUserPrompt(prompt: string, context: MedicalContext): string {
  const parts: string[] = [prompt];
  if (context.patientSummary) parts.push(`\n【患者摘要】${context.patientSummary}`);
  if (context.deptCode) parts.push(`\n【科室】${context.deptCode}`);
  if (context.staffRole) parts.push(`\n【岗位】${context.staffRole}`);
  if (context.extraNotes) parts.push(`\n【备注】${context.extraNotes}`);
  return parts.join('');
}

/**
 * 【AI能力深化】真实 LLM 对话调用（纯函数：全部依赖经 options 注入）。
 *
 * 流程：
 *  1. 解析 provider → 取默认端点/模型；
 *  2. 拼装 system + 裁剪后历史 + 本轮 user 消息；
 *  3. 单次请求带 AbortController 超时；失败按指数退避重试 maxRetries 次；
 *  4. 全部失败 → 返回降级模板回复（degraded=true），不抛错、不卡住系统。
 *
 * @param prompt  用户本轮提问
 * @param context 院内脱敏上下文（患者摘要/科室/岗位）
 * @param options 后端选择与运行参数（fetchImpl 可注入）
 */
export async function callRealLLM(
  prompt: string,
  context: MedicalContext = {},
  options: CallRealLLMOptions = {},
): Promise<LLMResponse> {
  const provider = resolveProvider(options.provider);
  const onWarning =
    options.onWarning ??
    ((m: string) => {
      // eslint-disable-next-line no-console
      console.warn(`[llmClient] ${m}`);
    });

  // ---- demo / 未配置上游：本地模板兜底，零网络请求 ----
  if (provider === 'demo') {
    return degradedReply(prompt, 'demo', 'local-demo', '演示模式');
  }

  const preset = PROVIDER_PRESETS[provider];
  const apiUrl = (options.apiUrl ?? '').trim().replace(/\/+$/, '') || preset.defaultApiUrl;
  const apiKey = (options.apiKey ?? '').trim();
  const model = (options.model ?? '').trim() || preset.defaultModel;
  const timeoutMs = Number.isInteger(options.timeoutMs) && (options.timeoutMs as number) > 0
    ? (options.timeoutMs as number)
    : DEFAULT_TIMEOUT_MS;
  const maxRetries = Number.isInteger(options.maxRetries) && (options.maxRetries as number) >= 0
    ? (options.maxRetries as number)
    : DEFAULT_MAX_RETRIES;
  const backoffBaseMs = Number.isFinite(options.backoffBaseMs as number) ? (options.backoffBaseMs as number) : DEFAULT_BACKOFF_BASE_MS;
  const temperature = options.temperature ?? 0.2;
  const maxContextTokens =
    Number.isInteger(options.maxContextTokens) && (options.maxContextTokens as number) > 0
      ? (options.maxContextTokens as number)
      : DEFAULT_MAX_CONTEXT_TOKENS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  // ---- 拼装消息序列 ----
  const systemMsg: LLMClientMessage = { role: 'system', content: buildMedicalSystemPrompt() };
  const userMsg: LLMClientMessage = { role: 'user', content: buildUserPrompt(prompt, context) };
  const rawMessages: LLMClientMessage[] = [systemMsg, ...(options.history ?? []), userMsg];
  const messages = manageContextWindow(rawMessages, maxContextTokens);

  // ---- 重试循环：首次 + maxRetries 次，指数退避 ----
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await callOnce(fetchImpl, apiUrl, apiKey, model, messages, temperature, timeoutMs, provider, preset.needsAuth);
      return { ...result, disclaimer: MEDICAL_DISCLAIMER };
    } catch (err) {
      lastErr = err;
      const reason = err instanceof Error ? err.message : String(err);
      onWarning(`callRealLLM 第 ${attempt + 1} 次尝试失败（${provider}）：${reason}`);
      if (attempt < maxRetries) {
        await sleep(backoffBaseMs * 2 ** attempt);
      }
    }
  }

  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  return degradedReply(prompt, provider, model, `模型调用失败已降级：${reason.slice(0, 80)}`);
}

/** 单次上游调用（OpenAI 兼容 /chat/completions），超时即 reject */
async function callOnce(
  fetchImpl: typeof fetch,
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: LLMClientMessage[],
  temperature: number,
  timeoutMs: number,
  provider: Exclude<LLMClientProvider, 'demo'>,
  needsAuth: boolean,
): Promise<Omit<LLMResponse, 'disclaimer'>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    // ollama 本地裸部署无鉴权；openai/qwen 有 key 一律按 Bearer 发送
    if (needsAuth && apiKey) headers.authorization = `Bearer ${apiKey}`;
    const resp = await fetchImpl(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, temperature, stream: false }),
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
      model: data.model ?? model,
      provider,
      degraded: false,
      finishReason: 'stop',
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
}
