/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { defaultConfig } from './default';
import { developmentConfig } from './development';
import { testConfig } from './test';
import { productionConfig } from './production';
import type { AppConfig, DeepPartial, NodeEnv } from './types';

/** 深度合并工具：后出现的对象覆盖前者，数组直接替换 */
function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value === undefined) continue;
    const prev = out[key];
    if (
      prev !== null &&
      typeof prev === 'object' &&
      !Array.isArray(prev) &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      out[key] = deepMerge(prev, value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * 根据 NODE_ENV 选择环境覆盖配置
 */
export function loadEnvironmentConfig(env: NodeEnv): DeepPartial<AppConfig> {
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'test':
      return testConfig;
    case 'production':
      return productionConfig;
    default:
      return {};
  }
}

/**
 * 合并默认配置与环境覆盖，得到完整配置（不含环境变量注入）
 */
export function buildBaseConfig(env: NodeEnv): AppConfig {
  return deepMerge(defaultConfig, { ...loadEnvironmentConfig(env), nodeEnv: env });
}

export type { AppConfig, DeepPartial, NodeEnv } from './types';
export { defaultConfig } from './default';
