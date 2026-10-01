/**
 * 健澜科技 jlmedaios - 嵌入提供者工厂 单元测试（M4-A）
 *
 * 验证按环境选择本地演示 / OpenAI 兼容提供方：
 *  - 默认与显式 local-demo 返回确定性本地嵌入；
 *  - openai 缺密钥明确抛错（不静默回退）；
 *  - openai 有密钥返回真实提供方；
 *  - 不支持的提供方抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import { createEmbeddingProviderFromEnv } from '../../src/knowledge/embeddings/createEmbeddingProvider.js';
import { OpenAIEmbeddingProvider } from '../../src/knowledge/embeddings/OpenAIEmbeddingProvider.js';
import { MockEmbeddingService } from '../../src/knowledge/vector/EmbeddingService.js';

describe('嵌入提供者工厂', () => {
  it('未指定时默认使用本地演示嵌入', () => {
    const svc = createEmbeddingProviderFromEnv({});
    expect(svc).toBeInstanceOf(MockEmbeddingService);
  });

  it('显式 local-demo 返回本地嵌入', () => {
    const svc = createEmbeddingProviderFromEnv({ EMBEDDING_PROVIDER: 'local-demo' });
    expect(svc).toBeInstanceOf(MockEmbeddingService);
  });

  it('mock 别名同样返回本地嵌入', () => {
    const svc = createEmbeddingProviderFromEnv({ EMBEDDING_PROVIDER: 'mock' });
    expect(svc).toBeInstanceOf(MockEmbeddingService);
  });

  it('openai 缺 EMBEDDING_API_KEY 时明确抛错', () => {
    expect(() =>
      createEmbeddingProviderFromEnv({ EMBEDDING_PROVIDER: 'openai' }),
    ).toThrow(/EMBEDDING_API_KEY/);
  });

  it('openai 有密钥时返回 OpenAI 兼容提供方', () => {
    const svc = createEmbeddingProviderFromEnv({
      EMBEDDING_PROVIDER: 'openai',
      EMBEDDING_API_KEY: 'sk-test',
      EMBEDDING_MODEL: 'text-embedding-3-small',
    });
    expect(svc).toBeInstanceOf(OpenAIEmbeddingProvider);
  });

  it('不支持的提供方抛错', () => {
    expect(() =>
      createEmbeddingProviderFromEnv({ EMBEDDING_PROVIDER: 'unknown-engine' }),
    ).toThrow(/不支持的 EMBEDDING_PROVIDER/);
  });

  it('本地嵌入对相同文本确定性产出相同向量', async () => {
    const svc = createEmbeddingProviderFromEnv({ EMBEDDING_PROVIDER: 'local-demo' });
    const a = await svc.embed('二甲双胍禁忌证');
    const b = await svc.embed('二甲双胍禁忌证');
    expect(a).toEqual(b);
  });
});
