/**
 * 健澜科技 jlmedaios - 解读用 LLM 客户端（M12-A，I/O 边界）
 *
 * OpenAI 兼容 chat/completions（蓝本 aiRecordAggregator.chatOnce）：
 *  - 未配置 LLM_API_KEY -> 抛 LlmNotConfiguredError（明确信号，绝不返回写死文本冒充 LLM）；
 *  - HTTP 非 2xx / 超时 / 网络错误 -> 抛 LlmTransportError（含真实原因）；
 *  - 成功返回 choices[0].message.content 原始文本（由 interpretEngine 做防御性 JSON 解析）。
 *
 * 三态由聚合器映射：
 *  - key 有 + 成功      -> deep_source='llm',            llm_status='llm_ok'
 *  - key 无             -> deep_source='rule',           llm_status='llm_not_configured'
 *  - key 有但失败        -> deep_source='llm_fallback',   llm_status='llm_error'
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class LlmNotConfiguredError extends Error {
  constructor(message = '未配置大模型 API Key（LLM_API_KEY）') {
    super(message);
    this.name = 'LlmNotConfiguredError';
  }
}

export class LlmTransportError extends Error {
  constructor(
    public readonly cause?: unknown,
    message = '大模型调用失败',
  ) {
    super(message);
    this.name = 'LlmTransportError';
  }
}

export interface LlmClientOptions {
  /** 测试可注入自定义 fetch；默认全局 fetch。 */
  fetchImpl?: typeof fetch;
}

/** 读取运行时配置（每次调用读取，便于测试与运维动态切换）。 */
export function readLlmConfig(): { apiKey: string | undefined; baseURL: string; model: string } {
  const apiKey = process.env.LLM_API_KEY;
  const baseURL = (process.env.LLM_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL ?? 'deepseek-chat';
  return { apiKey, baseURL, model };
}

/**
 * 调用 chat/completions，返回模型输出文本。
 * @throws {LlmNotConfiguredError} 未配置 API Key
 * @throws {LlmTransportError}     HTTP 非 2xx / 超时 / 网络错误 / 空响应
 */
export async function chatCompletionJson(
  system: string,
  user: string,
  opts: LlmClientOptions = {},
): Promise<string> {
  const { apiKey, baseURL, model } = readLlmConfig();
  if (!apiKey) throw new LlmNotConfiguredError();

  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (timer.unref) timer.unref();

  try {
    const response = await fetchImpl(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: Number(process.env.LLM_MAX_TOKENS) || 4096,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new LlmTransportError(
        undefined,
        `大模型 HTTP ${response.status}: ${detail.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new LlmTransportError(undefined, '大模型返回空内容');
    }
    return content;
  } catch (err) {
    if (err instanceof LlmNotConfiguredError || err instanceof LlmTransportError) throw err;
    // 超时（abort）与网络错误统一包装为传输错误
    const reason = err instanceof Error ? err.message : String(err);
    throw new LlmTransportError(err, `大模型调用失败: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}
