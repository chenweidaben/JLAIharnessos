/**
 * MEDMUSE 模型提供者 生产加固 单测。
 *
 * 覆盖四条关键路径：
 *  1. 超时路径  - 上游挂起不回，AbortController 超时后降级（confidence=low）；
 *  2. 熔断路径  - 连续失败达到阈值后，冷却期内直接降级、不再打上游；
 *  3. 重试路径  - 前 N 次失败、最后一次成功时，指数退避后恢复正常输出；
 *  4. 降级路径  - 全部尝试失败后返回模板 mock（confidence=low、degraded=true）。
 *
 * 单测统一注入 backoffBaseMs=0，避免真实等待 1s/2s/4s。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import {
  OpenAICompatibleModelProvider,
  _resetCircuitBreaker,
  _resetModelProviderCache,
  getCircuitState,
} from '@/bff/agents/modelProvider.js';

/** 构造一个测试用 provider：退避置 0、显式端点/密钥，与环境解耦。 */
function makeProvider(options?: {
  timeoutMs?: number;
  maxRetries?: number;
  failureThreshold?: number;
  cooldownMs?: number;
}) {
  return new OpenAICompatibleModelProvider({
    baseUrl: 'http://radar.test.local/v1',
    apiKey: 'sk-test',
    model: 'radar-test-70b',
    backoffBaseMs: 0,
    ...options,
  });
}

/** 构造一个上游成功响应（OpenAI chat/completions 最小结构）。 */
function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
  });
}

const USER_MSG = [{ role: 'user' as const, content: '二甲双胍禁忌证' }];

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  _resetCircuitBreaker();
  _resetModelProviderCache();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe('OpenAICompatibleModelProvider 生产加固', () => {
  it('超时路径：上游挂起时按超时降级，confidence=low', async () => {
    // mock 模拟真实 fetch 行为：AbortController abort 时按 signal reject
    // （否则挂起 promise 永不 settle，无法验证超时分支）
    const fetchMock = mock((_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('The operation was aborted.')),
        );
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const provider = makeProvider({ timeoutMs: 20, maxRetries: 0 });
    const reply = await provider.chat(USER_MSG, []);

    expect(reply.degraded).toBe(true);
    expect(reply.confidence).toBe('low');
    // 超时后只打了一次上游（maxRetries=0）
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it('熔断路径：连续失败达阈值后冷却期内不再打上游', async () => {
    const fetchMock = mock(async () => {
      throw new Error('upstream 503');
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const provider = makeProvider({
      maxRetries: 0,
      failureThreshold: 3,
      cooldownMs: 60_000,
    });

    // 前三次调用各自失败 -> failures 累计到 3，第 3 次触发熔断
    for (let i = 0; i < 3; i++) {
      const r = await provider.chat(USER_MSG, []);
      expect(r.degraded).toBe(true);
    }
    expect(getCircuitState(3, 60_000).state).toBe('open');

    // 第 4 次调用：熔断打开，直接降级，不应再调用上游
    const reply = await provider.chat(USER_MSG, []);
    expect(reply.degraded).toBe(true);
    expect(reply.confidence).toBe('low');
    expect(fetchMock.mock.calls.length).toBe(3);
  });

  it('重试路径：前 2 次失败、第 3 次成功时恢复正常输出', async () => {
    let calls = 0;
    const fetchMock = mock(async () => {
      calls += 1;
      if (calls <= 2) throw new Error(`transient ${calls}`);
      return okResponse('二甲双胍禁用于严重肾功能不全。');
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const provider = makeProvider({ maxRetries: 3 });
    const reply = await provider.chat(USER_MSG, []);

    expect(reply.degraded).toBe(false);
    expect(reply.confidence).toBe('medium');
    expect(reply.content).toContain('二甲双胍');
    expect(fetchMock.mock.calls.length).toBe(3);
    // 成功后熔断器被清零
    expect(getCircuitState().state).toBe('closed');
  });

  it('降级路径：全部尝试失败后返回模板 mock（confidence=low）', async () => {
    const fetchMock = mock(async () => {
      throw new Error('upstream down');
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    // maxRetries=3 => 首次 + 3 次重试 = 共 4 次尝试
    const provider = makeProvider({ maxRetries: 3 });
    const reply = await provider.chat(USER_MSG, []);

    expect(reply.degraded).toBe(true);
    expect(reply.confidence).toBe('low');
    expect(reply.toolCalls).toEqual([]);
    expect(reply.content).toContain('模型服务暂不可用');
    expect(fetchMock.mock.calls.length).toBe(4);
  });
});
