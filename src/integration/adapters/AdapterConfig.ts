/**
 * 健澜科技数智医院智能体 - integration/adapters/AdapterConfig.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 适配器配置
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * @module integration/adapters/AdapterConfig
 */

import type { AdapterType } from '../types';

/** 认证类型 */
export type AuthType = 'none' | 'apiKey' | 'basic' | 'oauth2' | 'bearer' | 'custom';

/** 认证配置 */
export interface AuthConfig {
  /** 认证类型 */
  type: AuthType;
  /** API Key */
  apiKey?: string;
  /** API Key 请求头名称 */
  apiKeyHeader?: string;
  /** 用户名（basic认证） */
  username?: string;
  /** 密码（basic认证） */
  password?: string;
  /** OAuth2 Client ID */
  clientId?: string;
  /** OAuth2 Client Secret */
  clientSecret?: string;
  /** OAuth2 Token URL */
  tokenUrl?: string;
  /** OAuth2 Scope */
  scope?: string;
  /** Bearer Token */
  token?: string;
  /** 自定义认证头 */
  customHeaders?: Record<string, string>;
}

/** 重试配置 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始重试延迟（毫秒） */
  initialDelayMs: number;
  /** 最大重试延迟（毫秒） */
  maxDelayMs: number;
  /** 退避因子（指数退避） */
  backoffFactor: number;
  /** 重试时是否添加抖动 */
  jitter: boolean;
}

/** 熔断器配置 */
export interface CircuitBreakerConfig {
  /** 是否启用熔断器 */
  enabled: boolean;
  /** 滑动窗口大小（请求数） */
  windowSize: number;
  /** 失败率阈值（百分比，0-100），超过则打开熔断器 */
  failureThreshold: number;
  /** 最小请求数（达到此数量才计算失败率） */
  minimumRequests: number;
  /** 熔断器打开持续时间（毫秒），之后进入半开状态 */
  openDurationMs: number;
  /** 半开状态允许的探测请求数 */
  halfOpenRequests: number;
}

/** 字段映射规则 */
export interface FieldMappingRule {
  /** 源字段名（外部系统字段） */
  sourceField: string;
  /** 目标字段名（内部模型字段） */
  targetField: string;
  /** 值映射表（源值 → 目标值） */
  valueMap?: Record<string, string>;
  /** 默认值 */
  defaultValue?: unknown;
  /** 是否必填 */
  required?: boolean;
  /** 数据类型转换 */
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  /** 日期格式（源格式） */
  sourceDateFormat?: string;
  /** 日期格式（目标格式） */
  targetDateFormat?: string;
}

/** 字段映射配置（按实体分组） */
export type FieldMappingConfig = Record<string, FieldMappingRule[]>;

/** 编码转换规则 */
export interface CodeMappingRule {
  /** 源编码体系 */
  sourceSystem: string;
  /** 目标编码体系 */
  targetSystem: string;
  /** 编码映射表 */
  mappings: Record<string, string>;
  /** 未匹配时的默认编码 */
  defaultCode?: string;
}

/** 编码转换配置 */
export type CodeMappingConfig = Record<string, CodeMappingRule>;

/** 单位转换规则 */
export interface UnitConversionRule {
  /** 源单位 */
  fromUnit: string;
  /** 目标单位 */
  toUnit: string;
  /** 转换因子（目标值 = 源值 * factor + offset） */
  factor: number;
  /** 偏移量 */
  offset?: number;
  /** 小数位数 */
  precision?: number;
}

/** 编码转换配置类型 */
export interface EncodingConfig {
  /** 请求编码 */
  requestEncoding: string;
  /** 响应编码 */
  responseEncoding: string;
  /** 是否自动转码 */
  autoTranscode: boolean;
}

/** 适配器配置 */
export interface AdapterConfig {
  // === 基本配置 ===
  /** 适配器ID */
  id: string;
  /** 适配器类型 */
  type: AdapterType;
  /** 厂商名称 */
  vendor: string;
  /** 适配器版本 */
  version: string;
  /** 显示名称 */
  name?: string;
  /** 描述 */
  description?: string;

  // === 连接配置 ===
  /** 服务端点URL */
  endpoint: string;
  /** 备用端点列表 */
  fallbackEndpoints?: string[];
  /** 请求超时（毫秒） */
  timeout: number;
  /** 连接超时（毫秒） */
  connectTimeout?: number;
  /** 读取超时（毫秒） */
  readTimeout?: number;

  // === 认证配置 ===
  auth: AuthConfig;

  // === 重试配置 ===
  retry: RetryConfig;

  // === 熔断器配置 ===
  circuitBreaker: CircuitBreakerConfig;

  // === 字段映射配置 ===
  fieldMapping?: FieldMappingConfig;

  // === 编码转换配置 ===
  codeMapping?: CodeMappingConfig;

  // === 单位转换配置 ===
  unitConversions?: UnitConversionRule[];

  // === 编码配置 ===
  encoding?: EncodingConfig;

  // === 协议配置 ===
  /** 通信协议 */
  protocol?: 'rest' | 'soap' | 'hl7' | 'tcp' | 'file' | 'custom';
  /** HL7配置 */
  hl7?: {
    version: string;
    sendingApplication: string;
    sendingFacility: string;
    receivingApplication: string;
    receivingFacility: string;
    useMLLP: boolean;
  };
  /** SOAP配置 */
  soap?: {
    wsdlUrl?: string;
    namespace?: string;
    soapAction?: string;
  };

  // === 日志配置 ===
  log?: {
    /** 是否记录请求体 */
    logRequestBody: boolean;
    /** 是否记录响应体 */
    logResponseBody: boolean;
    /** 日志级别 */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** 敏感字段脱敏 */
    sensitiveFields: string[];
  };

  // === 扩展配置 ===
  /** 厂商特定配置 */
  vendorConfig?: Record<string, unknown>;
  /** 额外HTTP头 */
  defaultHeaders?: Record<string, string>;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 创建默认适配器配置
 *
 * @param overrides - 覆盖默认值的配置
 * @returns 完整的适配器配置
 */
export function createDefaultAdapterConfig(overrides: Partial<AdapterConfig>): AdapterConfig {
  return {
    id: overrides.id ?? 'default',
    type: overrides.type ?? 'generic',
    vendor: overrides.vendor ?? 'unknown',
    version: overrides.version ?? '1.0.0',
    name: overrides.name,
    description: overrides.description,
    endpoint: overrides.endpoint ?? 'http://localhost:8080',
    fallbackEndpoints: overrides.fallbackEndpoints,
    timeout: overrides.timeout ?? 30000,
    connectTimeout: overrides.connectTimeout ?? 10000,
    readTimeout: overrides.readTimeout ?? 30000,
    auth: {
      type: 'none',
      ...overrides.auth,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 30000,
      backoffFactor: 2,
      jitter: true,
      ...overrides.retry,
    },
    circuitBreaker: {
      enabled: true,
      windowSize: 20,
      failureThreshold: 50,
      minimumRequests: 5,
      openDurationMs: 30000,
      halfOpenRequests: 3,
      ...overrides.circuitBreaker,
    },
    fieldMapping: overrides.fieldMapping,
    codeMapping: overrides.codeMapping,
    unitConversions: overrides.unitConversions,
    encoding: overrides.encoding ?? {
      requestEncoding: 'UTF-8',
      responseEncoding: 'UTF-8',
      autoTranscode: true,
    },
    protocol: overrides.protocol ?? 'rest',
    hl7: overrides.hl7,
    soap: overrides.soap,
    log: {
      logRequestBody: false,
      logResponseBody: false,
      level: 'info',
      sensitiveFields: ['password', 'token', 'apiKey', 'idCard', 'phone'],
      ...overrides.log,
    },
    vendorConfig: overrides.vendorConfig,
    defaultHeaders: overrides.defaultHeaders,
    enabled: overrides.enabled ?? true,
  };
}
