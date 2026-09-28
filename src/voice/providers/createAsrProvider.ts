/**
 * 健澜科技 jlmedaios - ASR 提供者工厂（按环境配置选择）
 *
 * 环境变量：
 *   ASR_PROVIDER  本地离线默认 local-demo；openai/whisper 走 OpenAI 兼容 HTTP；
 *   ASR_BASE_URL  OpenAI 兼容服务根地址（默认 https://api.openai.com/v1）；
 *   ASR_API_KEY   识别服务密钥（选择真实提供方时必填，不打印/不落库）；
 *   ASR_MODEL     识别模型（默认 whisper-1）。
 *
 * 选择真实提供方但缺密钥时明确抛错，绝不静默回退到演示引擎冒充真实识别。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AsrProvider } from '../types.js';
import { LocalDemoAsrProvider } from './LocalDemoAsrProvider.js';
import { OpenAICompatibleAsrProvider } from './OpenAICompatibleAsrProvider.js';

export type AsrEnv = Record<string, string | undefined>;

export function createAsrProviderFromEnv(env: AsrEnv = process.env): AsrProvider {
  const name = (env.ASR_PROVIDER ?? 'local-demo').trim().toLowerCase();

  if (name === 'openai' || name === 'whisper') {
    const apiKey = env.ASR_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ASR_PROVIDER=openai 时必须配置 ASR_API_KEY（缺失则无法真实识别）');
    }
    return new OpenAICompatibleAsrProvider({
      baseURL: (env.ASR_BASE_URL ?? 'https://api.openai.com/v1').trim(),
      apiKey,
      model: (env.ASR_MODEL ?? 'whisper-1').trim(),
    });
  }

  if (name === 'local-demo' || name === 'mock' || name === '') {
    return new LocalDemoAsrProvider();
  }

  throw new Error(
    `不支持的 ASR_PROVIDER: ${name}（支持 local-demo / openai；其他商用引擎请实现 AsrProvider）`,
  );
}
