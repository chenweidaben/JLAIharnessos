/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { AppConfig } from './types';

/**
 * 默认配置（所有环境的基线）
 *
 * 实际部署时由各环境配置与环境变量覆盖。
 */
export const defaultConfig: AppConfig = {
  nodeEnv: 'development',
  appName: 'jianlan-medical-agent',
  appVersion: '0.1.0',
  httpPort: 8080,
  httpTimeoutMs: 30_000,
  llm: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-4-5',
    baseUrl: 'https://api.anthropic.com',
    maxTokens: 8192,
    temperature: 0.2,
    timeoutMs: 60_000,
  },
  integration: {
    hisBaseUrl: 'http://his.hospital.internal:8080',
    hisApiKey: '',
    hisTimeoutMs: 5000,
    emrBaseUrl: 'http://emr.hospital.internal:8081',
    emrApiKey: '',
    lisBaseUrl: 'http://lis.hospital.internal:8082',
    pacsBaseUrl: 'http://pacs.hospital.internal:8083',
  },
  logging: {
    level: 'info',
    dir: './logs',
    maxSizeBytes: 10 * 1024 * 1024,
    maxFiles: 14,
    auditRetentionDays: 180,
  },
  security: {
    encryptionMasterKey: '',
    jwtSecret: '',
    enableDesensitization: true,
    enablePromptGuard: true,
  },
  monitoring: {
    sentryDsn: undefined,
    perfApiTimeoutMs: 2000,
    perfToolTimeoutMs: 5000,
    healthCheckPath: '/health',
  },
};
