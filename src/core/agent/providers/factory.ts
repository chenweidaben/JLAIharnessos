/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * LLM Provider 工厂
 *
 * 依据 process.env.LLM_PROVIDER 装配具体的 ILLMClient 实现：
 * - 'deepseek'：返回 DeepSeekProvider（OpenAI Chat Completions 兼容）；
 * - 其他/缺省：返回现有 Anthropic LLMClient（保持默认行为不变）。
 *
 * 所有敏感凭证仅从 process.env 读取，严禁硬编码。
 */

import { LLMClient } from '../LLMClient';
import type { ILLMClient } from '../LLMClient';

import { BailianProvider } from './BailianProvider';
import { DeepSeekProvider } from './DeepSeekProvider';

/**
 * 根据环境变量创建 LLM 客户端
 *
 * @returns 实现 ILLMClient 的 Provider 实例
 */
export function createLlmClient(): ILLMClient {
  const provider = (process.env.LLM_PROVIDER ?? '').toLowerCase();

  if (provider === 'deepseek') {
    return new DeepSeekProvider({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL,
      chatModel: process.env.LLM_MODEL,
      reasoningModel: process.env.LLM_REASONING_MODEL,
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || undefined,
    });
  }

  // 阿里云百炼（DashScope）；同时接受 dashscope / qwen 作为别名
  if (provider === 'bailian' || provider === 'dashscope' || provider === 'qwen') {
    return new BailianProvider({
      apiKey: process.env.BAILIAN_API_KEY ?? process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.BAILIAN_BASE_URL,
      chatModel: process.env.BAILIAN_MODEL,
      reasoningModel: process.env.BAILIAN_REASONING_MODEL,
      contextWindow: Number(process.env.BAILIAN_CONTEXT_WINDOW) || undefined,
      timeoutMs: Number(process.env.BAILIAN_TIMEOUT_MS) || undefined,
    });
  }

  // 默认：保持现有 Anthropic 实现，行为不变
  return new LLMClient({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || undefined,
  });
}
