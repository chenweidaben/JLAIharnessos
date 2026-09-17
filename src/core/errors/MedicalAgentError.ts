/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 医疗智能体自定义错误类
 *
 * 所有工具执行、权限校验、审计日志等操作抛出的错误均使用此类。
 * 包含错误码、错误消息和可选的详细信息，便于上层统一处理和审计追踪。
 */
export class MedicalAgentError extends Error {
  /** 错误码，用于程序化判断和国际化 */
  public readonly code: string;

  /** 错误详细信息，包含上下文数据 */
  public readonly details?: Record<string, unknown>;

  /** 错误发生时间戳 */
  public readonly timestamp: number;

  /**
   * 创建医疗智能体错误实例
   *
   * @param code - 错误码，采用大写下划线命名，如 'PERMISSION_DENIED'
   * @param message - 面向用户的错误描述
   * @param details - 可选的详细信息，包含调试和审计所需的上下文数据
   *
   * @example
   * ```typescript
   * throw new MedicalAgentError(
   *   'PERMISSION_DENIED',
   *   '无患者查询权限',
   *   { userId: 'u001', requiredPermission: 'patient:read' }
   * );
   * ```
   */
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'MedicalAgentError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();

    // 保持原型链正确（TypeScript 编译目标 ES5 时需要）
    Object.setPrototypeOf(this, MedicalAgentError.prototype);
  }

  /**
   * 将错误转换为可序列化的普通对象
   *
   * @returns 包含错误全部信息的纯对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * 从普通错误创建 MedicalAgentError 实例
   *
   * @param error - 原始错误对象
   * @param code - 错误码，默认为 'INTERNAL_ERROR'
   * @param details - 附加详细信息
   * @returns 新的 MedicalAgentError 实例
   */
  public static from(
    error: unknown,
    code = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
  ): MedicalAgentError {
    if (error instanceof MedicalAgentError) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return new MedicalAgentError(code, message, {
      ...details,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/** 常用错误码常量 */
export const ErrorCodes = {
  /** 内部错误 */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** 权限不足 */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** 未认证 */
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  /** 参数校验失败 */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** 工具未找到 */
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  /** 工具执行超时 */
  TOOL_TIMEOUT: 'TOOL_TIMEOUT',
  /** 工具执行被中断 */
  TOOL_INTERRUPTED: 'TOOL_INTERRUPTED',
  /** 需要用户确认 */
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  /** 确认令牌无效 */
  INVALID_CONFIRMATION_TOKEN: 'INVALID_CONFIRMATION_TOKEN',
  /** 患者未找到 */
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  /** 外部系统连接失败 */
  EXTERNAL_SYSTEM_ERROR: 'EXTERNAL_SYSTEM_ERROR',
  /** 数据脱敏失败 */
  DESENSITIZATION_ERROR: 'DESENSITIZATION_ERROR',
  /** 审计日志写入失败 */
  AUDIT_LOG_ERROR: 'AUDIT_LOG_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
