/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { AppConfig, DeepPartial } from './types';

/**
 * 开发环境配置覆盖
 */
export const developmentConfig: DeepPartial<AppConfig> = {
  nodeEnv: 'development',
  logging: {
    level: 'debug',
    dir: './logs/dev',
  },
  llm: {
    // 开发环境可指向 Mock / 本地代理，避免烧真实额度
    baseUrl: process.env.LLM_BASE_URL ?? 'http://localhost:8081/v1',
    temperature: 0.3,
  },
  security: {
    // 开发环境允许放宽部分校验以便调试
    enableDesensitization: false,
  },
};
