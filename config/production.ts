/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { AppConfig, DeepPartial } from './types';

/**
 * 生产环境配置覆盖
 *
 * 生产环境的敏感值（密钥、内网地址）一律通过环境变量注入，
 * 此处仅给出不可被覆盖的硬约束。
 */
export const productionConfig: DeepPartial<AppConfig> = {
  nodeEnv: 'production',
  logging: {
    level: 'info',
    // 生产日志按天 / 大小轮转，保留 180 天
    maxFiles: 180,
    auditRetentionDays: 180,
  },
  security: {
    enableDesensitization: true,
    enablePromptGuard: true,
  },
  llm: {
    temperature: 0.1,
    timeoutMs: 90_000,
  },
};
