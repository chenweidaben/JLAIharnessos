/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type {
  AuditLogEntry,
  AuditLogger,
  ConfirmationCallbacks,
  EncounterSummary,
  MedicalConfig,
  MedicalToolContext,
  MedicalUser,
  PatientSummary,
  PermissionChecker,
  PermissionCheckResult,
} from '@/types';

/**
 * MedicalToolContext 构造参数
 */
export interface MedicalToolContextOptions {
  /** 当前操作用户 */
  user: MedicalUser;
  /** 当前患者摘要（如有） */
  patient?: PatientSummary;
  /** 当前就诊摘要（如有） */
  encounter?: EncounterSummary;
  /** 会话ID */
  sessionId: string;
  /** 全链路追踪ID */
  traceId?: string;
  /** 审计日志器 */
  audit: AuditLogger;
  /** 权限检查器 */
  permissionChecker: PermissionChecker;
  /** 确认回调 */
  confirmation: ConfirmationCallbacks;
  /** 系统配置 */
  config: MedicalConfig;
  /** 中断信号 */
  signal?: AbortSignal;
  /** 工具执行超时（毫秒） */
  timeoutMs?: number;
  /** 是否急诊越权模式 */
  emergencyOverride?: boolean;
}

/**
 * 医疗工具执行上下文实现
 *
 * 贯穿整个工具调用链，包含用户信息、患者上下文、安全组件等。
 * 提供便捷方法用于权限检查、审计日志记录和配置获取。
 *
 * 基于 claude-code ToolUseContext 扩展，增加医疗安全字段。
 *
 * @example
 * ```typescript
 * const context = new MedicalToolContextImpl({
 *   user: currentUser,
 *   patient: currentPatient,
 *   sessionId: 'sess_001',
 *   audit: auditLogger,
 *   permissionChecker: permissionChecker,
 *   confirmation: confirmationCallbacks,
 *   config: systemConfig,
 * });
 *
 * // 便捷方法
 * const result = await context.checkPermission('patient:read');
 * await context.logAudit({ toolName: 'query_patient', success: true });
 * const timeout = context.getConfig<number>('defaultToolTimeoutMs');
 * ```
 */
export class MedicalToolContextImpl implements MedicalToolContext {
  // === 只读属性 ===
  public readonly user: MedicalUser;
  public readonly patient?: PatientSummary;
  public readonly encounter?: EncounterSummary;
  public readonly sessionId: string;
  public readonly traceId: string;
  public readonly audit: AuditLogger;
  public readonly permissionChecker: PermissionChecker;
  public readonly confirmation: ConfirmationCallbacks;
  public readonly config: MedicalConfig;
  public readonly signal?: AbortSignal;
  public readonly timeoutMs?: number;
  public readonly emergencyOverride?: boolean;

  /**
   * 创建医疗工具执行上下文实例
   *
   * @param options - 上下文构造参数
   * @throws {MedicalAgentError} 当必要参数缺失时抛出
   */
  constructor(options: MedicalToolContextOptions) {
    if (!options.user) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'MedicalToolContext requires a valid user',
      );
    }
    if (!options.sessionId) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'MedicalToolContext requires a valid sessionId',
      );
    }
    if (!options.audit) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'MedicalToolContext requires an audit logger',
      );
    }
    if (!options.permissionChecker) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'MedicalToolContext requires a permission checker',
      );
    }
    if (!options.confirmation) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'MedicalToolContext requires confirmation callbacks',
      );
    }
    if (!options.config) {
      throw new MedicalAgentError(
        ErrorCodes.VALIDATION_ERROR,
        'MedicalToolContext requires a valid config',
      );
    }

    this.user = options.user;
    this.patient = options.patient;
    this.encounter = options.encounter;
    this.sessionId = options.sessionId;
    this.traceId = options.traceId ?? this.generateTraceId();
    this.audit = options.audit;
    this.permissionChecker = options.permissionChecker;
    this.confirmation = options.confirmation;
    this.config = options.config;
    this.signal = options.signal;
    this.timeoutMs = options.timeoutMs ?? options.config.defaultToolTimeoutMs;
    this.emergencyOverride = options.emergencyOverride ?? false;
  }

  /**
   * 检查当前用户是否拥有指定权限
   *
   * 委托给权限检查器，传递当前用户和患者上下文。
   * 急诊越权模式下，所有权限检查返回允许（但仍记录审计）。
   *
   * @param permission - 权限标识（如 'patient:read'）
   * @returns 权限检查结果
   */
  public async checkPermission(permission: string): Promise<PermissionCheckResult> {
    // 急诊越权模式：允许所有操作，但需记录审计
    if (this.emergencyOverride) {
      return {
        allowed: true,
        suggestedAction: 'emergency_override',
      };
    }

    const context: Record<string, unknown> = {};
    if (this.patient) {
      context.patientId = this.patient.patientId;
      context.department = this.patient.department;
    }
    if (this.encounter) {
      context.encounterId = this.encounter.encounterId;
    }

    return this.permissionChecker.check(this.user, permission, context);
  }

  /**
   * 记录审计日志
   *
   * 自动填充上下文中的用户、患者、会话、追踪ID等信息，
   * 然后委托给审计日志器记录。
   *
   * @param entry - 审计日志条目（部分字段由上下文自动填充）
   */
  public async logAudit(entry: Partial<AuditLogEntry>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      timestamp: entry.timestamp ?? Date.now(),
      userId: entry.userId ?? this.user.userId,
      userName: entry.userName ?? this.user.name,
      userRole: entry.userRole ?? this.user.role,
      toolName: entry.toolName ?? 'unknown',
      toolCategory: entry.toolCategory ?? 'unknown',
      riskLevel: entry.riskLevel ?? 'low',
      patientId: entry.patientId ?? this.patient?.patientId,
      encounterId: entry.encounterId ?? this.encounter?.encounterId,
      input: entry.input ?? {},
      outputSummary: entry.outputSummary,
      success: entry.success ?? true,
      errorMessage: entry.errorMessage,
      durationMs: entry.durationMs ?? 0,
      clientIp: entry.clientIp ?? this.user.clientIp,
      traceId: entry.traceId ?? this.traceId,
      sessionId: entry.sessionId ?? this.sessionId,
      confirmation: entry.confirmation,
    };

    try {
      await this.audit.log(fullEntry);
    } catch (error) {
      // 审计日志写入失败不应阻塞工具执行，但需要记录错误
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * 获取配置项
   *
   * @param key - 配置键
   * @returns 配置值，不存在时返回 undefined
   */
  public getConfig<T = unknown>(key: string): T | undefined {
    return this.config[key] as T | undefined;
  }

  /**
   * 检查是否已中断
   *
   * @returns 是否已发出中断信号
   */
  public isAborted(): boolean {
    return this.signal?.aborted ?? false;
  }

  /**
   * 抛出中断错误（如果已中断）
   *
   * @throws {MedicalAgentError} 当已发出中断信号时抛出
   */
  public throwIfAborted(): void {
    if (this.signal?.aborted) {
      throw new MedicalAgentError(ErrorCodes.TOOL_INTERRUPTED, 'Tool execution was interrupted');
    }
  }

  /**
   * 创建子上下文（用于子代理或嵌套工具调用）
   *
   * @param overrides - 覆盖的字段
   * @returns 新的上下文实例
   */
  public createChildContext(overrides: Partial<MedicalToolContextOptions>): MedicalToolContextImpl {
    return new MedicalToolContextImpl({
      user: this.user,
      patient: this.patient,
      encounter: this.encounter,
      sessionId: this.sessionId,
      traceId: this.traceId,
      audit: this.audit,
      permissionChecker: this.permissionChecker,
      confirmation: this.confirmation,
      config: this.config,
      signal: this.signal,
      timeoutMs: this.timeoutMs,
      emergencyOverride: this.emergencyOverride,
      ...overrides,
    });
  }

  /**
   * 生成追踪ID
   *
   * @returns 唯一追踪ID
   */
  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `trace_${timestamp}_${random}`;
  }
}
