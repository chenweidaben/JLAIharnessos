/**
 * 健澜科技 jlmedaios - 真实 LLM 适配层单元测试（M118-C）。
 *
 * 验证：
 *  - 模式切换：demo / openai / ollama 三种模式的请求报文与鉴权头差异；
 *  - 降级逻辑：上游失败自动切回 demo、降级期不再打上游、健康探测恢复后解除降级；
 *  - 配置校验：非法 LLM_PROVIDER 抛错、非 demo 但缺 URL 自动降级并告警。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  createLLMAdapter,
  parseLLMAdapterEnv,
  type LLMMessage,
} from '../../src/bff/llm/llmAdapter.js';

const messages: LLMMessage[] = [
  { role: 'system', content: '你是病历助手' },
  { role: 'user', content: '患者主诉胸痛三天' },
];

/** 构造可记录调用的伪 fetch */
function makeFakeFetch(opts: {
  modelResponseBody?: unknown;
  chatResponseBody?: unknown;
  chatStatus?: number;
  modelStatus?: number;
  shouldThrow?: boolean;
}) {
  const calls: Array<{ url: string; method: string; auth?: string; body?: unknown }> = [];
  // bun-types 的 fetch 类型带 preconnect 等运行时扩展，伪 fetch 只需结构兼容，故 cast
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      auth: headers.authorization,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (opts.shouldThrow) throw new Error('ECONNREFUSED');
    if (url.endsWith('/models')) {
      return new Response(JSON.stringify({ data: [] }), {
        status: opts.modelStatus ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify(
        opts.chatResponseBody ?? {
          model: 'qwen2.5-72b-instruct',
          choices: [{ message: { content: '考虑急性冠脉综合征，建议心电图' } }],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        },
      ),
      { status: opts.chatStatus ?? 200, headers: { 'content-type': 'application/json' } },
    );
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe('LLM 适配层 - 模式切换', () => {
  it('demo 模式不发任何网络请求，直接返回模板回复', async () => {
    const warnings: string[] = [];
    const { fetchImpl, calls } = makeFakeFetch({});
    const adapter = createLLMAdapter({
      provider: 'demo',
      fetchImpl,
      onWarning: (m) => warnings.push(m),
    });
    expect(adapter.mode).toBe('demo');
    const reply = await adapter.chat(messages);
    expect(reply.degraded).toBe(true);
    expect(reply.mode).toBe('demo');
    expect(calls.length).toBe(0);
  });

  it('openai 模式携带 Bearer 密钥并 POST /chat/completions', async () => {
    const { fetchImpl, calls } = makeFakeFetch({});
    const adapter = createLLMAdapter({
      provider: 'openai',
      apiUrl: 'https://gw.example.com/v1/',
      apiKey: 'sk-test-secret',
      model: 'gpt-test',
      fetchImpl,
    });
    expect(adapter.mode).toBe('openai');
    const reply = await adapter.chat(messages, { temperature: 0.1 });
    expect(reply.degraded).toBe(false);
    expect(reply.content).toContain('急性冠脉综合征');
    expect(reply.usage?.totalTokens).toBe(20);
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('https://gw.example.com/v1/chat/completions');
    expect(calls[0].auth).toBe('Bearer sk-test-secret');
    expect((calls[0].body as { model: string }).model).toBe('gpt-test');
  });

  it('ollama/vLLM 本地模式无密钥时不发送 Authorization 头', async () => {
    const { fetchImpl, calls } = makeFakeFetch({});
    const adapter = createLLMAdapter({
      provider: 'ollama',
      apiUrl: 'http://127.0.0.1:11434/v1',
      model: 'qwen2.5',
      fetchImpl,
    });
    expect(adapter.mode).toBe('ollama');
    await adapter.chat(messages);
    expect(calls[0].url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(calls[0].auth).toBeUndefined();
  });
});

describe('LLM 适配层 - 自动降级', () => {
  it('上游抛错时切回 demo 并记录告警，且降级期不再打上游', async () => {
    const warnings: string[] = [];
    const { fetchImpl, calls } = makeFakeFetch({ shouldThrow: true });
    const adapter = createLLMAdapter({
      provider: 'openai',
      apiUrl: 'http://downstream/v1',
      apiKey: 'k',
      model: 'm',
      fetchImpl,
      onWarning: (m) => warnings.push(m),
    });

    const first = await adapter.chat(messages);
    expect(first.degraded).toBe(true);
    expect(first.mode).toBe('demo');
    expect(calls.length).toBe(1);
    expect(warnings.some((w) => w.includes('已降级'))).toBe(true);

    // 降级期第二次 chat：不应再发请求
    const second = await adapter.chat(messages);
    expect(second.degraded).toBe(true);
    expect(calls.length).toBe(1);

    const st = adapter.status();
    expect(st.degraded).toBe(true);
    expect(st.healthy).toBe(false);
    // 状态快照绝不回传密钥
    expect(JSON.stringify(st)).not.toContain('sk-');
  });

  it('健康探测成功后自动解除降级，后续 chat 恢复打上游', async () => {
    let failOnce = true;
    const calls: Array<{ url: string }> = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push({ url });
      if (failOnce && url.endsWith('/chat/completions')) throw new Error('boom');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    const adapter = createLLMAdapter({
      provider: 'openai',
      apiUrl: 'http://up/v1',
      apiKey: 'k',
      model: 'm',
      fetchImpl,
      onWarning: () => {},
    });

    const degradedReply = await adapter.chat(messages);
    expect(degradedReply.degraded).toBe(true);

    const health = await adapter.health();
    expect(health.healthy).toBe(true);
    expect(adapter.status().degraded).toBe(false);

    failOnce = false;
    const recovered = await adapter.chat(messages);
    expect(recovered.degraded).toBe(false);
    expect(recovered.content).toBe('ok');
  });
});

describe('LLM 适配层 - 配置校验', () => {
  it('非法 LLM_PROVIDER 直接抛错', () => {
    expect(() =>
      parseLLMAdapterEnv({ LLM_PROVIDER: 'deepseek-proprietary' }),
    ).toThrow(/非法 LLM_PROVIDER/);
  });

  it('openai 模式缺 LLM_API_URL 时自动降级 demo 并告警', () => {
    const { config, warnings } = parseLLMAdapterEnv({
      LLM_PROVIDER: 'openai',
      LLM_API_KEY: 'sk-x',
      LLM_MODEL: 'm',
    });
    expect(config.mode).toBe('demo');
    expect(config.requestedProvider).toBe('openai');
    expect(warnings.some((w) => w.includes('自动降级为 demo'))).toBe(true);
  });

  it('缺省环境（无 LLM_PROVIDER）即 demo 模式，无告警', () => {
    const { config, warnings } = parseLLMAdapterEnv({});
    expect(config.mode).toBe('demo');
    expect(warnings.length).toBe(0);
  });
});
