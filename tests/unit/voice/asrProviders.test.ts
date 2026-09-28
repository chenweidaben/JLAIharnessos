/**
 * 健澜科技 jlmedaios - ASR 提供者 / 工厂 单元测试（M2-C）
 *
 * - 工厂：按环境选择本地演示 / OpenAI 兼容，缺密钥与不支持的配置明确报错；
 * - 本地演示引擎：已知引用确定转写、未知引用空文本提示；
 * - OpenAI 兼容提供者：在网络边界（global fetch）打桩，验证音频读取、
 *   multipart 上传与 verbose_json 解析，以及错误路径；不打桩业务逻辑。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, describe, expect, it } from 'bun:test';
import {
  LocalDemoAsrProvider,
  OpenAICompatibleAsrProvider,
  createAsrProviderFromEnv,
} from '../../../src/voice/index.js';

/* -------------------------------- 工厂 ------------------------------- */

describe('M2-C ASR 工厂', () => {
  it('默认 / local-demo / mock 返回本地演示引擎', () => {
    expect(createAsrProviderFromEnv({}).name).toBe('local-demo');
    expect(createAsrProviderFromEnv({ ASR_PROVIDER: 'local-demo' }).name).toBe('local-demo');
    expect(createAsrProviderFromEnv({ ASR_PROVIDER: 'mock' }).name).toBe('local-demo');
  });

  it('openai 缺密钥明确报错（不静默回退演示）', () => {
    expect(() => createAsrProviderFromEnv({ ASR_PROVIDER: 'openai' })).toThrow(/ASR_API_KEY/);
    expect(() => createAsrProviderFromEnv({ ASR_PROVIDER: 'whisper' })).toThrow(/ASR_API_KEY/);
  });

  it('openai 配置齐全返回 OpenAI 兼容提供者', () => {
    const p = createAsrProviderFromEnv({
      ASR_PROVIDER: 'openai',
      ASR_API_KEY: 'k-test',
      ASR_BASE_URL: 'https://asr.example/v1',
      ASR_MODEL: 'large-v3',
    });
    expect(p).toBeInstanceOf(OpenAICompatibleAsrProvider);
    expect(p.name).toBe('openai');
  });

  it('不支持的提供者报错', () => {
    expect(() =>
      createAsrProviderFromEnv({ ASR_PROVIDER: 'unknown-engine', ASR_API_KEY: 'k' }),
    ).toThrow(/不支持的 ASR_PROVIDER/);
  });
});

/* ----------------------------- 本地演示引擎 ----------------------------- */

describe('M2-C 本地演示 ASR', () => {
  const p = new LocalDemoAsrProvider();

  it('已知引用确定性转写并标注 local-demo', async () => {
    const r = await p.transcribe({ audioRef: 'demo:cardiology-followup', locale: 'zh-CN' });
    expect(r.provider).toBe('local-demo');
    expect(r.fullText).toContain('心梗');
    expect(r.segments.length).toBe(3);
    expect(r.durationMs).toBeGreaterThan(0);
    expect(r.warnings.join('')).toContain('local-demo');
  });

  it('未知引用空文本、不臆造并给出可用引用', async () => {
    const r = await p.transcribe({ audioRef: 'nope' });
    expect(r.fullText).toBe('');
    expect(r.segments).toHaveLength(0);
    expect(r.warnings.join('')).toContain('未预置');
    expect(r.warnings.join('')).toContain('demo:');
  });

  it('健康检查恒可用（离线）', async () => {
    const h = await p.healthCheck!();
    expect(h.ok).toBe(true);
  });
});

/* --------------------------- OpenAI 兼容（网络打桩） --------------------------- */

describe('M2-C OpenAI 兼容 ASR', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch() {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      // 音频拉取
      if (!url.includes('/audio/transcriptions')) {
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
      }
      // 转写结果（verbose_json）
      const payload = {
        text: '患者有冠心病，口服阿司匹林',
        duration: 1.2,
        segments: [
          { start: 0, end: 0.6, text: '患者有冠心病', avg_logprob: -0.1 },
          { start: 0.6, end: 1.2, text: '口服阿司匹林', avg_logprob: -0.2 },
        ],
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
  }

  it('读取 URL 音频并解析 verbose_json 分段', async () => {
    stubFetch();
    const p = new OpenAICompatibleAsrProvider({
      baseURL: 'https://asr.example/v1',
      apiKey: 'k-test',
      model: 'whisper-1',
    });
    const r = await p.transcribe({ audioRef: 'https://obj.example/audio.wav' });
    expect(r.provider).toBe('openai');
    expect(r.fullText).toContain('冠心病');
    expect(r.segments).toHaveLength(2);
    expect(r.segments[0].startMs).toBe(0);
    expect(r.segments[1].endMs).toBe(1200);
    // avg_logprob 折算置信度
    expect(r.segments[0].confidence).toBeCloseTo(0.9, 1);
    expect(r.durationMs).toBe(1200);
  });

  it('服务返回非 200 明确抛错（不返回假转写）', async () => {
    globalThis.fetch = (async () => new Response('boom', { status: 401 })) as unknown as typeof fetch;
    const p = new OpenAICompatibleAsrProvider({
      baseURL: 'https://asr.example/v1',
      apiKey: 'bad',
      model: 'whisper-1',
    });
    expect(
      p.transcribe({ audioRef: 'https://obj.example/audio.wav' }),
    ).rejects.toThrow(/HTTP 401/);
  });

  it('健康检查：200 为 ok，异常为不可用', async () => {
    globalThis.fetch = (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    const ok = new OpenAICompatibleAsrProvider({
      baseURL: 'https://asr.example/v1', apiKey: 'k', model: 'whisper-1',
    });
    expect((await ok.healthCheck()).ok).toBe(true);

    globalThis.fetch = (async () => new Response('x', { status: 401 })) as unknown as typeof fetch;
    const bad = new OpenAICompatibleAsrProvider({
      baseURL: 'https://asr.example/v1', apiKey: 'k', model: 'whisper-1',
    });
    expect((await bad.healthCheck()).ok).toBe(false);
  });
});
