/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 全局配置类型定义
 *
 * 所有环境配置均满足此类型；运行期由 ConfigManager 通过 zod 校验。
 */

export type NodeEnv = 'development' | 'test' | 'production';

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'local';
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

export interface IntegrationConfig {
  hisBaseUrl: string;
  hisApiKey: string;
  hisTimeoutMs: number;
  emrBaseUrl: string;
  emrApiKey: string;
  lisBaseUrl: string;
  pacsBaseUrl: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  dir: string;
  maxSizeBytes: number;
  maxFiles: number;
  auditRetentionDays: number;
}

export interface SecurityConfig {
  encryptionMasterKey: string;
  jwtSecret: string;
  enableDesensitization: boolean;
  enablePromptGuard: boolean;
}

export interface MonitoringConfig {
  sentryDsn?: string;
  perfApiTimeoutMs: number;
  perfToolTimeoutMs: number;
  healthCheckPath: string;
}

export interface AppConfig {
  nodeEnv: NodeEnv;
  appName: string;
  appVersion: string;
  httpPort: number;
  httpTimeoutMs: number;
  llm: LLMConfig;
  integration: IntegrationConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

/** 深度可选：对象字段可整体省略，且内部字段也可省略 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
