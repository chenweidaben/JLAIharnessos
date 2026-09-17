/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { AppConfig, DeepPartial } from './types';

/**
 * 测试环境配置覆盖
 */
export const testConfig: DeepPartial<AppConfig> = {
  nodeEnv: 'test',
  logging: {
    level: 'warn',
    dir: './logs/test',
  },
  llm: {
    baseUrl: 'http://localhost:0/mock',
    apiKey: 'test-fixture-key',
  },
  integration: {
    // 测试环境全部走 Mock 适配器
    hisBaseUrl: 'mock://his',
    emrBaseUrl: 'mock://emr',
    lisBaseUrl: 'mock://lis',
    pacsBaseUrl: 'mock://pacs',
  },
};
