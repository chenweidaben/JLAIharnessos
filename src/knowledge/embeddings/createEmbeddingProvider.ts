/**
 * 健澜科技 jlmedaios - 嵌入（Embedding）提供者工厂（按环境配置选择）
 *
 * 环境变量：
 *   EMBEDDING_PROVIDER   本地离线默认 local-demo；openai 走 OpenAI 兼容 HTTP；
 *   EMBEDDING_BASE_URL   OpenAI 兼容服务根地址（默认 https://api.openai.com/v1）；
 *   EMBEDDING_API_KEY    嵌入服务密钥（选择真实提供方时必填，不打印/不落库）；
 *   EMBEDDING_MODEL      嵌入模型（默认 text-embedding-3-small）；
 *   EMBEDDING_DIMENSION  本地演示嵌入维度（默认 1024）。
 *
 * 选择真实提供方但缺密钥时明确抛错，绝不静默回退到演示引擎冒充真实语义。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { EmbeddingService } from '../vector/EmbeddingService';
import {
  DEFAULT_EMBEDDING_DIMENSION,
  MockEmbeddingService,
} from '../vector/EmbeddingService';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';

export type EmbeddingEnv = Record<string, string | undefined>;

export function createEmbeddingProviderFromEnv(
  env: EmbeddingEnv = process.env,
): EmbeddingService {
  const name = (env.EMBEDDING_PROVIDER ?? 'local-demo').trim().toLowerCase();

  if (name === 'openai') {
    const apiKey = env.EMBEDDING_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('EMBEDDING_PROVIDER=openai 时必须配置 EMBEDDING_API_KEY（缺失则无法真实向量化）');
    }
    return new OpenAIEmbeddingProvider({
      baseURL: (env.EMBEDDING_BASE_URL ?? 'https://api.openai.com/v1').trim(),
      apiKey,
      model: (env.EMBEDDING_MODEL ?? 'text-embedding-3-small').trim(),
    });
  }

  if (name === 'local-demo' || name === 'mock' || name === '') {
    const dim = Number.parseInt(env.EMBEDDING_DIMENSION ?? '', 10);
    return new MockEmbeddingService(
      Number.isFinite(dim) && dim > 0 ? dim : DEFAULT_EMBEDDING_DIMENSION,
    );
  }

  throw new Error(
    `不支持的 EMBEDDING_PROVIDER: ${name}（支持 local-demo / openai；其他商用引擎请实现 EmbeddingService）`,
  );
}
