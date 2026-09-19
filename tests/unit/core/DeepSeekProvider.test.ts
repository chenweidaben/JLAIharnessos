/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - DeepSeekProvider（OpenAI Chat Completions 兼容 + SSE 流式）
 *
 * 全部通过注入 fetchImpl 伪造网络，不访问真实接口。
 * 覆盖：文本流式拼接、工具调用分片累积、模型别名映射、usage 累计、
 *       超时/重试触发、[DONE] 终止。
 */

import { describe, it, expect } from 'bun:test';

import { DeepSeekProvider } from '@/core/agent/providers/DeepSeekProvider';
import { createLlmClient } from '@/core/agent/providers/factory';

import type { LLMRequestParams } from '@/core/agent/loopTypes';

// ============================================================
// 测试工具：构造 SSE 流
// ============================================================

/** 把多行 SSE 文本编码为可读流 */
function sseResponse(body: string, status = 200): Response {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(body);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/** 文本流式 SSE 负载 */
const TEXT_SSE = [
  'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}',
  'data: {"choices":[{"delta":{"content":"您好，"}}]}',
  'data: {"choices":[{"delta":{"content":"已为您查询到门诊号源。"}}]}',
  'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
  'data: {"usage":{"prompt_tokens":12,"completion_tokens":8}}',
  'data: [DONE]',
].join('\n\n');

/** 工具调用分片 SSE 负载（id/name 首 chunk，arguments 分片累积） */
const TOOL_SSE = [
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"query_patient","arguments":""}}]}}]}',
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"patient"}}]}}]}',
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"Id\\":\\"P001\\"}"}}]}}]}',
  'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
  'data: {"usage":{"prompt_tokens":30,"completion_tokens":15}}',
  'data: [DONE]',
].join('\n\n');

const BASE_PARAMS: LLMRequestParams = {
  system: '你是门诊导诊助手',
  messages: [{ role: 'user', content: [{ type: 'text', text: '帮我查 P001' }] }],
  tools: [
    {
      name: 'query_patient',
      description: '查询患者',
      inputSchema: {
        type: 'object',
        properties: { patientId: { type: 'string' } },
      },
    },
  ],
  maxTokens: 256,
};

async function collect(
  provider: DeepSeekProvider,
  params: LLMRequestParams = BASE_PARAMS,
  alias?: 'sonnet' | 'opus' | 'haiku',
) {
  const events: Awaited<ReturnType<typeof provider.streamChat> extends AsyncGenerator<infer E> ? E : never>[] = [];
  for await (const ev of provider.streamChat(params, alias)) {
    events.push(ev);
  }
  return events;
}

describe('DeepSeekProvider - 模型别名映射', () => {
  it('sonnet/haiku 应映射到 chatModel，opus 映射到 reasoningModel', () => {
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      chatModel: 'deepseek-chat',
      reasoningModel: 'deepseek-reasoner',
    });
    expect(p.getModel('sonnet').model).toBe('deepseek-chat');
    expect(p.getModel('haiku').model).toBe('deepseek-chat');
    expect(p.getModel('opus').model).toBe('deepseek-reasoner');
    // alias 保持合法 ModelAlias
    expect(p.getModel('opus').alias).toBe('opus');
    expect(p.getModel('sonnet').contextWindow).toBeGreaterThan(0);
  });

  it('初始累计用量应为 0，且返回副本', () => {
    const p = new DeepSeekProvider({ apiKey: 'sk-test' });
    expect(p.getCumulativeUsage()).toEqual({ input: 0, output: 0 });
  });
});

describe('DeepSeekProvider - 文本流式拼接', () => {
  it('应按顺序产出 text_delta 并在 message_stop 聚合全文与 usage', async () => {
    const calls: { url: string; body: string }[] = [];
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      fetchImpl: (async (url: string, init?: RequestInit) => {
        calls.push({ url, body: String(init?.body ?? '') });
        return sseResponse(TEXT_SSE);
      }) as unknown as typeof fetch,
    });

    const events = await collect(p);

    const types = events.map((e) => e.type);
    expect(types[0]).toBe('message_start');
    expect(types).toContain('text_delta');
    expect(types).toContain('message_stop');

    const deltas = events.filter((e) => e.type === 'text_delta') as { text: string }[];
    expect(deltas.map((d) => d.text).join('')).toBe('您好，已为您查询到门诊号源。');

    const stop = events.find((e) => e.type === 'message_stop') as Extract<
      (typeof events)[number],
      { type: 'message_stop' }
    >;
    expect(stop.text).toBe('您好，已为您查询到门诊号源。');
    expect(stop.usage).toEqual({ input: 12, output: 8 });
    expect(stop.stopReason).toBe('stop');

    // 累计用量已计入
    expect(p.getCumulativeUsage()).toEqual({ input: 12, output: 8 });

    // 请求体应为 OpenAI Chat Completions 格式
    expect(calls[0].url).toContain('/chat/completions');
    const req = JSON.parse(calls[0].body);
    expect(req.model).toBe('deepseek-chat');
    expect(req.stream).toBe(true);
    expect(req.messages[0].role).toBe('system');
  });
});

describe('DeepSeekProvider - 工具调用分片累积', () => {
  it('应触发 start/input_delta/end，并合并 arguments 为完整 JSON', async () => {
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      fetchImpl: (async () => sseResponse(TOOL_SSE)) as unknown as typeof fetch,
    });

    const events = await collect(p);

    const start = events.find((e) => e.type === 'tool_use_start');
    expect(start).toBeDefined();
    expect((start as { id: string; name: string }).id).toBe('call_1');
    expect((start as { name: string }).name).toBe('query_patient');

    const deltas = events.filter((e) => e.type === 'tool_use_input_delta');
    expect(deltas.length).toBe(2);

    const end = events.find((e) => e.type === 'tool_use_end') as {
      id: string;
      input: Record<string, unknown>;
    };
    expect(end).toBeDefined();
    expect(end.id).toBe('call_1');
    expect(end.input).toEqual({ patientId: 'P001' });

    const stop = events.find((e) => e.type === 'message_stop') as unknown as {
      toolCalls: readonly { id: string; name: string; input: unknown }[];
      stopReason: string | null;
    };
    expect(stop.toolCalls.length).toBe(1);
    expect(stop.stopReason).toBe('tool_calls');
  });
});

describe('DeepSeekProvider - 消息/工具映射', () => {
  it('tool_result 应映射为 role:tool 并带 tool_call_id', async () => {
    let captured = '';
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        captured = String(init?.body ?? '');
        return sseResponse(TEXT_SSE);
      }) as unknown as typeof fetch,
    });

    const params: LLMRequestParams = {
      system: 's',
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'call_x', name: 'query_patient', input: { patientId: 'P1' } },
          ],
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', toolUseId: 'call_x', content: '找到患者 P1', isError: false },
          ],
        },
      ],
      tools: [],
      maxTokens: 64,
    };
    await collect(p, params);

    const req = JSON.parse(captured);
    const roles = req.messages.map((m: { role: string }) => m.role);
    expect(roles).toEqual(['system', 'assistant', 'tool']);
    const toolMsg = req.messages.find((m: { role: string }) => m.role === 'tool');
    expect(toolMsg.tool_call_id).toBe('call_x');
    const asst = req.messages.find((m: { role: string }) => m.role === 'assistant');
    expect(asst.tool_calls[0].id).toBe('call_x');
  });
});

describe('DeepSeekProvider - 重试', () => {
  it('5xx 应触发重试，第二次成功', async () => {
    let attempts = 0;
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      maxRetries: 2,
      timeoutMs: 5000,
      fetchImpl: (async () => {
        attempts++;
        if (attempts === 1) {
          return new Response('upstream', { status: 500 });
        }
        return sseResponse(TEXT_SSE);
      }) as unknown as typeof fetch,
    });

    const events = await collect(p);
    expect(attempts).toBe(2);
    expect(events.some((e) => e.type === 'message_stop')).toBe(true);
  });

  it('4xx（非429）不应重试，直接抛错', async () => {
    let attempts = 0;
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      maxRetries: 2,
      fetchImpl: (async () => {
        attempts++;
        return new Response('bad request', { status: 400 });
      }) as unknown as typeof fetch,
    });

    await expect(collect(p)).rejects.toThrow();
    expect(attempts).toBe(1);
  });
});

describe('DeepSeekProvider - 鉴权与终止', () => {
  it('未配置 apiKey 应抛未认证错误，且不发起请求', async () => {
    const savedKey = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY; // 强制走"无 key"分支（构造器会回退读 env）
    try {
      let fetched = false;
      const p = new DeepSeekProvider({
        apiKey: undefined,
        fetchImpl: (async () => {
          fetched = true;
          return sseResponse(TEXT_SSE);
        }) as unknown as typeof fetch,
      });
      await expect(collect(p)).rejects.toThrow();
      expect(fetched).toBe(false);
    } finally {
      if (savedKey !== undefined) process.env.LLM_API_KEY = savedKey;
    }
  });

  it('[DONE] 应正常终止且不报错', async () => {
    const p = new DeepSeekProvider({
      apiKey: 'sk-test',
      fetchImpl: (async () => sseResponse(TEXT_SSE)) as unknown as typeof fetch,
    });
    const events = await collect(p);
    expect(events.at(-1)?.type).toBe('message_stop');
  });
});

describe('factory - createLlmClient', () => {
  const originalProvider = process.env.LLM_PROVIDER;
  const originalKey = process.env.LLM_API_KEY;

  it('LLM_PROVIDER=deepseek 时返回 DeepSeekProvider 实例', () => {
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.LLM_API_KEY = 'sk-test';
    const client = createLlmClient();
    expect(client).toBeInstanceOf(DeepSeekProvider);
    // 还原，避免污染其他测试
    if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = originalProvider;
    if (originalKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = originalKey;
  });
});
