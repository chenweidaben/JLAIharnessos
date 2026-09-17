/**
 * 健澜科技数智医院智能体 - integration/adapters/AdapterError.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 适配器错误定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * @module integration/adapters/AdapterError
 */

/** 错误类型枚举 */
export enum AdapterErrorType {
  /** 连接错误 */
  CONNECTION = 'CONNECTION',
  /** 认证错误 */
  AUTHENTICATION = 'AUTHENTICATION',
  /** 授权错误 */
  AUTHORIZATION = 'AUTHORIZATION',
  /** 超时错误 */
  TIMEOUT = 'TIMEOUT',
  /** 数据格式错误 */
  DATA_FORMAT = 'DATA_FORMAT',
  /** 业务错误 */
  BUSINESS = 'BUSINESS',
  /** 未找到 */
  NOT_FOUND = 'NOT_FOUND',
  /** 冲突 */
  CONFLICT = 'CONFLICT',
  /** 熔断 */
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  /** 限流 */
  RATE_LIMIT = 'RATE_LIMIT',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/** 错误码定义 */
export const AdapterErrorCode = {
  // 连接类 1xxx
  CONNECTION_REFUSED: 'E1001',
  CONNECTION_TIMEOUT: 'E1002',
  CONNECTION_RESET: 'E1003',
  DNS_RESOLUTION_FAILED: 'E1004',
  NETWORK_UNREACHABLE: 'E1005',

  // 认证类 2xxx
  INVALID_API_KEY: 'E2001',
  INVALID_CREDENTIALS: 'E2002',
  TOKEN_EXPIRED: 'E2003',
  TOKEN_INVALID: 'E2004',
  AUTHENTICATION_FAILED: 'E2005',

  // 授权类 3xxx
  PERMISSION_DENIED: 'E3001',
  ACCESS_FORBIDDEN: 'E3002',
  SCOPE_INSUFFICIENT: 'E3003',

  // 超时类 4xxx
  REQUEST_TIMEOUT: 'E4001',
  READ_TIMEOUT: 'E4002',
  WRITE_TIMEOUT: 'E4003',

  // 数据格式类 5xxx
  INVALID_RESPONSE: 'E5001',
  PARSE_ERROR: 'E5002',
  VALIDATION_ERROR: 'E5003',
  MISSING_FIELD: 'E5004',
  ENCODING_ERROR: 'E5005',

  // 业务类 6xxx
  PATIENT_NOT_FOUND: 'E6001',
  ENCOUNTER_NOT_FOUND: 'E6002',
  ORDER_NOT_FOUND: 'E6003',
  ORDER_CANCEL_FAILED: 'E6004',
  DUPLICATE_ORDER: 'E6005',
  INSUFFICIENT_BALANCE: 'E6006',
  BUSINESS_RULE_VIOLATION: 'E6007',

  // 系统类 7xxx
  CIRCUIT_BREAKER_OPEN: 'E7001',
  RATE_LIMIT_EXCEEDED: 'E7002',
  SERVICE_UNAVAILABLE: 'E7003',
  INTERNAL_ERROR: 'E7004',
  ADAPTER_NOT_INITIALIZED: 'E7005',
  ADAPTER_NOT_CONNECTED: 'E7006',

  // 未知 9xxx
  UNKNOWN_ERROR: 'E9001',
} as const;

export type AdapterErrorCodeValue = (typeof AdapterErrorCode)[keyof typeof AdapterErrorCode];

/** 可重试错误类型集合 */
const RETRYABLE_ERROR_TYPES: ReadonlySet<AdapterErrorType> = new Set([
  AdapterErrorType.CONNECTION,
  AdapterErrorType.TIMEOUT,
  AdapterErrorType.RATE_LIMIT,
  AdapterErrorType.UNKNOWN,
]);

/** 可重试错误码集合 */
const RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  AdapterErrorCode.CONNECTION_REFUSED,
  AdapterErrorCode.CONNECTION_TIMEOUT,
  AdapterErrorCode.CONNECTION_RESET,
  AdapterErrorCode.NETWORK_UNREACHABLE,
  AdapterErrorCode.REQUEST_TIMEOUT,
  AdapterErrorCode.READ_TIMEOUT,
  AdapterErrorCode.WRITE_TIMEOUT,
  AdapterErrorCode.RATE_LIMIT_EXCEEDED,
  AdapterErrorCode.SERVICE_UNAVAILABLE,
  AdapterErrorCode.TOKEN_EXPIRED,
]);

/**
 * 适配器错误类
 *
 * 所有适配器抛出的错误均为此类型，包含错误类型、错误码、
 * 可重试标记及详细上下文信息。
 */
export class AdapterError extends Error {
  /** 错误类型 */
  public readonly errorType: AdapterErrorType;
  /** 错误码 */
  public readonly code: string;
  /** 是否可重试 */
  public readonly retryable: boolean;
  /** HTTP状态码（如适用） */
  public readonly httpStatus?: number;
  /** 原始错误 */
  public readonly cause?: unknown;
  /** 附加上下文 */
  public readonly context?: Record<string, unknown>;
  /** 适配器ID */
  public readonly adapterId?: string;
  /** 请求ID */
  public readonly requestId?: string;

  constructor(
    errorType: AdapterErrorType,
    code: string,
    message: string,
    options: {
      retryable?: boolean;
      httpStatus?: number;
      cause?: unknown;
      context?: Record<string, unknown>;
      adapterId?: string;
      requestId?: string;
    } = {},
  ) {
    super(message);
    this.name = 'AdapterError';
    this.errorType = errorType;
    this.code = code;
    this.retryable = options.retryable ?? isRetryable(errorType, code);
    this.httpStatus = options.httpStatus;
    this.cause = options.cause;
    this.context = options.context;
    this.adapterId = options.adapterId;
    this.requestId = options.requestId;

    // 保持原型链（TypeScript target ES5+ 下需要）
    Object.setPrototypeOf(this, AdapterError.prototype);
  }

  /**
   * 将错误转换为可序列化对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      errorType: this.errorType,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      httpStatus: this.httpStatus,
      adapterId: this.adapterId,
      requestId: this.requestId,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * 从普通错误创建 AdapterError
   */
  static from(error: unknown, adapterId?: string): AdapterError {
    if (error instanceof AdapterError) {
      return error;
    }
    if (error instanceof Error) {
      return new AdapterError(
        AdapterErrorType.UNKNOWN,
        AdapterErrorCode.UNKNOWN_ERROR,
        error.message,
        { cause: error, adapterId, retryable: true },
      );
    }
    return new AdapterError(
      AdapterErrorType.UNKNOWN,
      AdapterErrorCode.UNKNOWN_ERROR,
      String(error),
      { adapterId, retryable: true },
    );
  }

  /** 创建连接错误 */
  static connection(
    message: string,
    code: string = AdapterErrorCode.CONNECTION_REFUSED,
    options: Partial<ConstructorParameters<typeof AdapterError>[3]> = {},
  ): AdapterError {
    return new AdapterError(AdapterErrorType.CONNECTION, code, message, {
      retryable: true,
      ...options,
    });
  }

  /** 创建超时错误 */
  static timeout(
    message: string,
    options: Partial<ConstructorParameters<typeof AdapterError>[3]> = {},
  ): AdapterError {
    return new AdapterError(AdapterErrorType.TIMEOUT, AdapterErrorCode.REQUEST_TIMEOUT, message, {
      retryable: true,
      ...options,
    });
  }

  /** 创建认证错误 */
  static authentication(
    message: string,
    code: string = AdapterErrorCode.AUTHENTICATION_FAILED,
    options: Partial<ConstructorParameters<typeof AdapterError>[3]> = {},
  ): AdapterError {
    return new AdapterError(AdapterErrorType.AUTHENTICATION, code, message, {
      retryable: false,
      ...options,
    });
  }

  /** 创建数据格式错误 */
  static dataFormat(
    message: string,
    code: string = AdapterErrorCode.INVALID_RESPONSE,
    options: Partial<ConstructorParameters<typeof AdapterError>[3]> = {},
  ): AdapterError {
    return new AdapterError(AdapterErrorType.DATA_FORMAT, code, message, {
      retryable: false,
      ...options,
    });
  }

  /** 创建业务错误 */
  static business(
    message: string,
    code: string = AdapterErrorCode.BUSINESS_RULE_VIOLATION,
    options: Partial<ConstructorParameters<typeof AdapterError>[3]> = {},
  ): AdapterError {
    return new AdapterError(AdapterErrorType.BUSINESS, code, message, {
      retryable: false,
      ...options,
    });
  }

  /** 创建熔断错误 */
  static circuitBreaker(
    message: string,
    options: Partial<ConstructorParameters<typeof AdapterError>[3]> = {},
  ): AdapterError {
    return new AdapterError(
      AdapterErrorType.CIRCUIT_BREAKER,
      AdapterErrorCode.CIRCUIT_BREAKER_OPEN,
      message,
      { retryable: false, ...options },
    );
  }
}

/**
 * 判断错误是否可重试
 *
 * @param errorType - 错误类型
 * @param code - 错误码
 * @returns 是否可重试
 */
export function isRetryable(errorType: AdapterErrorType, code: string): boolean {
  if (RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }
  return RETRYABLE_ERROR_TYPES.has(errorType);
}
