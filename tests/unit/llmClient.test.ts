/**
 * 健澜科技 jlmedaios - 真实 LLM 客户端聚合器单元测试（M131-C，AI能力深化）。
 *
 * 验证：
 *  - callRealLLM：三种后端（openai/qwen/ollama）的请求报文与鉴权头差异；
 *  - 错误重试：前 N 次失败、末次成功即返回上游内容；全部失败降级本地模板；
 *  - 超时控制：AbortController 触发后快速降级，不挂住系统；
 *  - manageContextWindow：system 永不裁剪、超预算从旧消息开始丢弃、最新消息兜底截断；
 *  - buildMedicalSystemPrompt：内置医疗安全红线关键词。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMedicalSystemPrompt,
  callRealLLM,
  estimateTokens,
  manageContextWindow,
  type LLMClientMessage,
} from '../../src/bff/aggregators/llmClientAggregator.js';

/** 构造可记录调用的伪 fetch */
function makeFakeFetch(opts: {
  chatStatus?: number;
  failTimes?: number; // 前 N 次调用抛错
  responseBody?: unknown;
}) {
  const calls: Array<{ url: string; method: string; auth?: string; body?: unknown }> = [];
  let failed = 0;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      auth: headers.authorization,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (failed < (opts.failTimes ?? 0)) {
      failed += 1;
      throw new Error(`boom-${failed}`);
    }
    return new Response(
      JSON.stringify(
        opts.responseBody ?? {
          model: 'upstream-model',
          choices: [{ message: { content: '考虑急性冠脉综合征，建议12导联心电图' } }],
          usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
        },
      ),
      {
        status: opts.chatStatus ?? 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const HISTORY: LLMClientMessage[] = [
  { role: 'user', content: '患者主诉胸痛三小时' },
  { role: 'assistant', content: '建议即刻完善心电图与心肌酶谱检查' },
];

describe('callRealLLM - 后端切换', () => {
  it('缺省 demo 模式不发任何网络请求，返回降级模板', async () => {
    const { fetchImpl, calls } = makeFakeFetch({});
    const reply = await callRealLLM('胸痛怎么办', {}, { fetchImpl });
    expect(reply.degraded).toBe(true);
    expect(reply.provider).toBe('demo');
    expect(reply.finishReason).toBe('degraded');
    expect(calls.length).toBe(0);
  });

  it('openai（GPT-4）携带 Bearer 密钥并 POST /chat/completions', async () => {
    const { fetchImpl, calls } = makeFakeFetch({});
    const reply = await callRealLLM('胸痛怎么办', { deptCode: 'cardio' }, {
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      fetchImpl,
      backoffBaseMs: 0,
    });
    expect(reply.degraded).toBe(false);
    expect(reply.content).toContain('急性冠脉综合征');
    expect(reply.usage?.totalTokens).toBe(16);
    expect(reply.disclaimer).toContain('不构成诊疗依据');
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(calls[0].auth).toBe('Bearer sk-test');
    const body = calls[0].body as { model: string; messages: LLMClientMessage[] };
    expect(body.model).toBe('gpt-4o');
    // system 消息为医疗安全提示
    expect(body.messages[0].role).toBe('system');
    // user 消息拼接了院内上下文
    expect(body.messages[body.messages.length - 1].content).toContain('胸痛怎么办');
    expect(body.messages[body.messages.length - 1].content).toContain('cardio');
  });

  it('qwen（通义千问）走 DashScope 兼容端点并携带密钥', async () => {
    const { fetchImpl, calls } = makeFakeFetch({});
    await callRealLLM('血糖控制目标', {}, {
      provider: 'qwen',
      apiKey: 'sk-dashscope',
      fetchImpl,
      backoffBaseMs: 0,
    });
    expect(calls[0].url).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
    expect(calls[0].auth).toBe('Bearer sk-dashscope');
  });

  it('ollama 本地裸部署无密钥时不发送 Authorization 头', async () => {
    const { fetchImpl, calls } = makeFakeFetch({});
    await callRealLLM('术后注意事项', {}, {
      provider: 'ollama',
      apiUrl: 'http://127.0.0.1:11434/v1/',
      model: 'qwen2.5',
      fetchImpl,
      backoffBaseMs: 0,
    });
    expect(calls[0].url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(calls[0].auth).toBeUndefined();
  });
});

describe('callRealLLM - 错误重试与降级', () => {
  it('前 2 次失败、第 3 次成功：重试后返回上游内容', async () => {
    const { fetchImpl, calls } = makeFakeFetch({ failTimes: 2 });
    const reply = await callRealLLM('胸痛怎么办', {}, {
      provider: 'openai',
      apiKey: 'k',
      fetchImpl,
      maxRetries: 2,
      backoffBaseMs: 0,
    });
    expect(calls.length).toBe(3);
    expect(reply.degraded).toBe(false);
    expect(reply.content).toContain('急性冠脉综合征');
  });

  it('重试全部耗尽：降级本地模板，不抛错', async () => {
    const { fetchImpl, calls } = makeFakeFetch({ failTimes: 99 });
    const reply = await callRealLLM('胸痛怎么办', {}, {
      provider: 'openai',
      apiKey: 'k',
      fetchImpl,
      maxRetries: 2,
      backoffBaseMs: 0,
    });
    expect(calls.length).toBe(3); // 首次 + 2 次重试
    expect(reply.degraded).toBe(true);
    expect(reply.finishReason).toBe('degraded');
    expect(reply.content).toContain('大模型服务暂不可用');
  });

  it('HTTP 500 也触发重试并最终降级', async () => {
    const { fetchImpl, calls } = makeFakeFetch({ chatStatus: 500 });
    const reply = await callRealLLM('胸痛怎么办', {}, {
      provider: 'openai',
      apiKey: 'k',
      fetchImpl,
      maxRetries: 1,
      backoffBaseMs: 0,
    });
    expect(calls.length).toBe(2);
    expect(reply.degraded).toBe(true);
  });

  it('上游超时（signal abort）：快速降级，不挂起', async () => {
    const fetchImpl = ((_input: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted by timeout')));
      })) as unknown as typeof fetch;
    const reply = await callRealLLM('胸痛怎么办', {}, {
      provider: 'openai',
      apiKey: 'k',
      fetchImpl,
      timeoutMs: 20,
      maxRetries: 0,
    });
    expect(reply.degraded).toBe(true);
    expect(reply.finishReason).toBe('degraded');
  });
});

describe('manageContextWindow - 上下文裁剪', () => {
  const longText = '心血管评估要点'.repeat(60); // 远大于小预算
  const msgs: LLMClientMessage[] = [
    { role: 'system', content: buildMedicalSystemPrompt() },
    { role: 'user', content: longText },
    { role: 'assistant', content: longText },
    { role: 'user', content: '最新问题：下一步怎么办' },
  ];
  // system prompt 本身占有的 token 量，预算以此为基准推导（宁紧勿松）
  const systemTokens = estimateTokens(buildMedicalSystemPrompt());

  it('system 消息永远保留，旧消息被丢弃，预算收敛', () => {
    const budget = systemTokens + 40;
    const trimmed = manageContextWindow(msgs, budget);
    expect(trimmed[0].role).toBe('system');
    expect(trimmed[0].content).toBe(buildMedicalSystemPrompt());
    // 最新一条用户问题必须保留
    expect(trimmed.some((m) => m.content.includes('最新问题'))).toBe(true);
    // 总 token 不超预算
    const total = trimmed.reduce((s, m) => s + estimateTokens(m.content), 0);
    expect(total).toBeLessThanOrEqual(budget);
  });

  it('最新一条消息仍超剩余预算：截断保留最新一条，结构完整', () => {
    // 剩余预算小于最新一条消息的估算 token（约 11）
    const trimmed = manageContextWindow(msgs, systemTokens + 5);
    expect(trimmed[0].role).toBe('system');
    expect(trimmed.length).toBe(2); // system + 最新一条（截断后）
    expect(trimmed[1].content.length).toBeLessThanOrEqual(msgs[3].content.length);
  });

  it('空历史仅含 system 时原样返回', () => {
    const onlySystem: LLMClientMessage[] = [{ role: 'system', content: '你是助手' }];
    expect(manageContextWindow(onlySystem, 100)).toEqual(onlySystem);
  });

  it('非法预算值不抛错，回退默认预算', () => {
    expect(() => manageContextWindow(msgs, 0)).not.toThrow();
    expect(() => manageContextWindow(msgs, -5)).not.toThrow();
  });
});

describe('buildMedicalSystemPrompt - 医疗安全红线', () => {
  it('包含角色定位与免责/安全关键词', () => {
    const p = buildMedicalSystemPrompt();
    expect(p).toContain('健澜科技');
    expect(p).toContain('执业医师');
    expect(p).toContain('循证');
    expect(p).toContain('隐私');
  });

  it('纯函数：两次调用结果一致', () => {
    expect(buildMedicalSystemPrompt()).toBe(buildMedicalSystemPrompt());
  });
});
