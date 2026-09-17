/**
 * 健澜科技数智医院智能体 - integration/adapters/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 适配器模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 */

// 核心
export type {
  AdapterConfig,
  AuthConfig,
  AuthType,
  CircuitBreakerConfig,
  CodeMappingConfig,
  CodeMappingRule,
  EncodingConfig,
  FieldMappingConfig,
  FieldMappingRule,
  RetryConfig,
  UnitConversionRule,
} from './AdapterConfig';
export { createDefaultAdapterConfig } from './AdapterConfig';
export type { AdapterErrorCodeValue } from './AdapterError';
export { AdapterError, AdapterErrorCode, AdapterErrorType, isRetryable } from './AdapterError';
export type { AdapterFactory } from './AdapterRegistry';
export { AdapterRegistry } from './AdapterRegistry';
export type { AdapterLogger } from './BaseAdapter';
export { BaseAdapter } from './BaseAdapter';

// HIS
export * from './his';

// EMR
export * from './emr';

// LIS
export * from './lis';

// PACS
export * from './pacs';
