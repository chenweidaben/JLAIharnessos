/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { z } from 'zod';

import type { EncounterSummary, MedicalUser, PatientSummary } from './medical';

// ============================================================
// 工具分类与风险等级
// ============================================================

/** 医疗工具分类枚举 */
export enum MedicalToolCategory {
  /** 患者管理 */
  PATIENT = 'patient',
  /** 电子病历 */
  EMR = 'emr',
  /** 医嘱管理 */
  ORDER = 'order',
  /** 处方与药品 */
  PRESCRIPTION = 'prescription',
  /** 检验检查 */
  LAB = 'lab',
  /** 影像检查 */
  IMAGING = 'imaging',
  /** 临床决策支持 */
  CDS = 'cds',
  /** 系统集成 */
  INTEGRATION = 'integration',
  /** 质控与管理 */
  QUALITY = 'quality',
  /** 知识检索 */
  KNOWLEDGE = 'knowledge',
  /** 基础工具（文件操作等） */
  BASIC = 'basic',
}

/** 工具风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

// ============================================================
// 审计日志
// ============================================================

/** 审计日志条目 */
export interface AuditLogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 操作用户ID */
  userId: string;
  /** 操作用户姓名 */
  userName: string;
  /** 用户角色 */
  userRole: string;
  /** 工具名称 */
  toolName: string;
  /** 工具分类 */
  toolCategory: string;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 关联患者ID */
  patientId?: string;
  /** 关联就诊ID */
  encounterId?: string;
  /** 输入参数（脱敏后） */
  input: Record<string, unknown>;
  /** 输出摘要 */
  outputSummary?: string;
  /** 执行是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  errorMessage?: string;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** 客户端IP */
  clientIp?: string;
  /** 全链路追踪ID */
  traceId: string;
  /** 会话ID */
  sessionId: string;
  /** 确认信息（medium/high风险工具） */
  confirmation?: {
    confirmed: boolean;
    confirmedAt?: number;
    confirmationToken?: string;
    reviewerId?: string;
    caSignature?: string;
  };
}

/** 审计日志器接口 */
export interface AuditLogger {
  /**
   * 记录审计日志
   *
   * @param entry - 审计日志条目
   */
  log(entry: AuditLogEntry): Promise<void>;

  /**
   * 批量记录审计日志
   *
   * @param entries - 审计日志条目列表
   */
  logBatch(entries: readonly AuditLogEntry[]): Promise<void>;
}

// ============================================================
// 权限检查
// ============================================================

/** 权限检查结果 */
export interface PermissionCheckResult {
  /** 是否允许 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 所需权限 */
  requiredPermission?: string;
  /** 建议操作 */
  suggestedAction?: string;
}

/** 权限检查器接口 */
export interface PermissionChecker {
  /**
   * 检查用户是否拥有指定权限
   *
   * @param user - 当前用户
   * @param permission - 权限标识（如 'patient:read'）
   * @param context - 额外上下文（患者ID、科室等）
   * @returns 权限检查结果
   */
  check(
    user: MedicalUser,
    permission: string,
    context?: Record<string, unknown>,
  ): Promise<PermissionCheckResult>;

  /**
   * 检查用户是否拥有全部指定权限
   *
   * @param user - 当前用户
   * @param permissions - 权限标识列表
   * @param context - 额外上下文
   * @returns 权限检查结果
   */
  checkAll(
    user: MedicalUser,
    permissions: readonly string[],
    context?: Record<string, unknown>,
  ): Promise<PermissionCheckResult>;
}

// ============================================================
// 医疗校验与权限
// ============================================================

/** 医疗校验结果 */
export interface MedicalValidationResult {
  /** 是否通过校验 */
  valid: boolean;
  /** 校验错误列表 */
  errors: readonly {
    /** 字段名 */
    field: string;
    /** 错误消息 */
    message: string;
    /** 严重程度 */
    severity: 'error' | 'warning';
  }[];
}

/** 医疗权限检查结果 */
export interface MedicalPermissionResult {
  /** 是否允许 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 所需权限 */
  requiredPermission?: string;
  /** 建议操作 */
  suggestedAction?: string;
}

// ============================================================
// 工具执行上下文
// ============================================================

/** 系统配置接口 */
export interface MedicalConfig {
  /** 工具执行默认超时（毫秒） */
  defaultToolTimeoutMs: number;
  /** 最大并发工具数 */
  maxConcurrentTools: number;
  /** 最大重试次数（仅只读工具） */
  maxRetries: number;
  /** 工具结果最大字符数（超过则持久化） */
  maxResultSizeChars: number;
  /** 是否启用审计日志 */
  auditEnabled: boolean;
  /** 是否启用数据脱敏 */
  desensitizationEnabled: boolean;
  /** 急诊越权模式 */
  emergencyOverrideEnabled: boolean;
  /** 额外配置项 */
  [key: string]: unknown;
}

/** 确认请求回调 */
export interface ConfirmationCallbacks {
  /**
   * 请求用户单次确认
   *
   * @param message - 确认消息
   * @param details - 操作详情
   * @returns 用户是否确认
   */
  requestUserConfirm(message: string, details: Record<string, unknown>): Promise<boolean>;

  /**
   * 请求双重确认（高风险操作）
   *
   * @param message - 确认消息
   * @param details - 操作详情
   * @param reviewerRole - 审核人角色要求
   * @returns 是否通过双重确认
   */
  requestDoubleConfirm(
    message: string,
    details: Record<string, unknown>,
    reviewerRole?: string,
  ): Promise<boolean>;
}

/**
 * 工具执行上下文接口
 *
 * 贯穿整个工具调用链，包含用户信息、患者上下文、安全组件等。
 * 基于 claude-code ToolUseContext 扩展，增加医疗安全字段。
 */
export interface MedicalToolContext {
  // === 用户信息 ===
  /** 当前操作用户 */
  readonly user: MedicalUser;

  // === 患者与就诊 ===
  /** 当前患者摘要（如有） */
  readonly patient?: PatientSummary;
  /** 当前就诊摘要（如有） */
  readonly encounter?: EncounterSummary;

  // === 会话信息 ===
  /** 会话ID */
  readonly sessionId: string;
  /** 全链路追踪ID */
  readonly traceId: string;

  // === 安全组件 ===
  /** 审计日志器 */
  readonly audit: AuditLogger;
  /** 权限检查器 */
  readonly permissionChecker: PermissionChecker;
  /** 确认回调 */
  readonly confirmation: ConfirmationCallbacks;

  // === 系统配置 ===
  /** 系统配置 */
  readonly config: MedicalConfig;

  // === 执行控制 ===
  /** 中断信号 */
  readonly signal?: AbortSignal;
  /** 工具执行超时（毫秒） */
  readonly timeoutMs?: number;

  // === 急诊模式 ===
  /** 是否急诊越权模式 */
  readonly emergencyOverride?: boolean;

  // === 便捷方法 ===
  /**
   * 检查当前用户是否拥有指定权限
   *
   * @param permission - 权限标识
   * @returns 权限检查结果
   */
  checkPermission(permission: string): Promise<PermissionCheckResult>;

  /**
   * 记录审计日志
   *
   * @param entry - 审计日志条目（部分字段由上下文自动填充）
   */
  logAudit(entry: Partial<AuditLogEntry>): Promise<void>;

  /**
   * 获取配置项
   *
   * @param key - 配置键
   * @returns 配置值
   */
  getConfig<T = unknown>(key: string): T | undefined;

  /**
   * 检查是否已发出中断信号
   *
   * @returns 是否已中断
   */
  isAborted(): boolean;
}

// ============================================================
// 工具定义
// ============================================================

/**
 * 医疗工具定义接口
 *
 * 基于 claude-code Tool 类型扩展，增加医疗安全字段。
 * 所有医疗工具必须遵循此接口定义。
 */
export interface MedicalToolDefinition {
  // === 标识 ===
  /** 工具唯一名称（snake_case，如 query_patient） */
  readonly name: string;
  /** 工具描述（供LLM理解何时调用） */
  readonly description: string;
  /** 工具分类 */
  readonly category: MedicalToolCategory;
  /** 向后兼容别名 */
  readonly aliases?: readonly string[];
  /** 搜索提示词（3-10个词，用于工具搜索） */
  readonly searchHint?: string;

  // === 风险与权限 ===
  /** 风险等级 */
  readonly riskLevel: RiskLevel;
  /** 是否需要认证（默认 true） */
  readonly requiresAuth: boolean;
  /** 是否需要用户确认 */
  readonly requiresConfirm: boolean;
  /** 是否需要双重确认（high 风险默认 true） */
  readonly requiresDoubleConfirm?: boolean;
  /** 是否需要CA电子签名（高风险操作） */
  readonly requiresCASign?: boolean;
  /** 是否需要审计日志（默认 true） */
  readonly requiresAudit?: boolean;
  /** 所需权限列表（如 ['patient:read']） */
  readonly requiredPermissions: readonly string[];
  /** 允许使用的角色 */
  readonly allowedRoles?: readonly string[];
  /** 所需职称（如 ['attending', 'chief']） */
  readonly requiredTitles?: readonly string[];

  // === Schema 定义 ===
  /** 输入参数 Zod schema */
  readonly inputSchema: z.ZodType;
  /** 输出格式 Zod schema */
  readonly outputSchema?: z.ZodType;

  // === 执行入口 ===
  /**
   * 工具执行函数
   *
   * @param input - 经过 schema 校验的输入参数
   * @param context - 工具执行上下文
   * @returns 工具执行结果
   */
  execute(input: unknown, context: MedicalToolContext): Promise<unknown>;

  // === 能力标记（继承自 claude-code Tool） ===
  /** 是否可并发执行（默认 false，医疗安全） */
  isConcurrencySafe?(input: unknown): boolean;
  /** 是否启用（默认 true） */
  isEnabled?(): boolean;
  /** 是否只读操作（默认 false） */
  isReadOnly?(input: unknown): boolean;
  /** 是否不可逆操作（删除、覆盖、发送等） */
  isDestructive?(input: unknown): boolean;

  // === 医疗专用方法 ===
  /**
   * 医疗级输入校验（在 schema 校验之后执行）
   *
   * @param input - 输入参数
   * @param context - 工具执行上下文
   * @returns 医疗校验结果
   */
  validateMedicalInput?(
    input: unknown,
    context: MedicalToolContext,
  ): Promise<MedicalValidationResult>;

  /**
   * 医疗权限检查（在通用权限检查之后执行）
   *
   * @param input - 输入参数
   * @param context - 工具执行上下文
   * @returns 医疗权限检查结果
   */
  checkMedicalPermissions?(
    input: unknown,
    context: MedicalToolContext,
  ): Promise<MedicalPermissionResult>;

  /**
   * 生成审计日志条目
   *
   * @param input - 输入参数
   * @param output - 输出结果
   * @param context - 工具执行上下文
   * @returns 审计日志条目
   */
  getAuditLogEntry?(input: unknown, output: unknown, context: MedicalToolContext): AuditLogEntry;

  // === UI 渲染 ===
  /** 获取用户可见的工具名称 */
  userFacingName?(input: unknown): string;
  /** 获取执行中显示的活动描述 */
  getActivityDescription?(input: unknown): string | null;

  // === 执行控制 ===
  /** 工具执行超时（毫秒），覆盖默认值 */
  readonly timeout?: number;
  /** 工具结果最大字符数 */
  readonly maxResultSizeChars?: number;
  /** 中断行为：'cancel' 取消工具，'block' 阻塞新消息 */
  interruptBehavior?(): 'cancel' | 'block';
}

/** 构建后的医疗工具（所有可选字段已填充默认值） */
export type BuiltMedicalTool = Required<
  Pick<
    MedicalToolDefinition,
    | 'requiresAuth'
    | 'requiresConfirm'
    | 'requiresAudit'
    | 'isConcurrencySafe'
    | 'isEnabled'
    | 'isReadOnly'
    | 'isDestructive'
    | 'validateMedicalInput'
    | 'checkMedicalPermissions'
    | 'userFacingName'
  >
> &
  MedicalToolDefinition;

// ============================================================
// 工具调用与结果
// ============================================================

/** 工具调用 */
export interface ToolCall {
  /** 工具调用唯一ID */
  callId: string;
  /** 工具名称 */
  toolName: string;
  /** 输入参数 */
  input: Record<string, unknown>;
}

/** 工具执行结果 */
export interface ToolResult {
  /** 关联的工具调用ID */
  callId: string;
  /** 工具名称 */
  toolName: string;
  /** 是否成功 */
  success: boolean;
  /** 输出数据（成功时） */
  output?: unknown;
  /** 错误信息（失败时） */
  error?: ToolExecutionError;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** Token使用量 */
  tokens?: number;
}

/** 工具执行错误 */
export interface ToolExecutionError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: Record<string, unknown>;
  /** 错误类型 */
  errorType:
    | 'validation' // 参数校验错误
    | 'permission' // 权限不足
    | 'authentication' // 未认证
    | 'timeout' // 执行超时
    | 'interrupted' // 执行中断
    | 'confirmation' // 需要确认/确认被拒绝
    | 'external_system' // 外部系统错误
    | 'internal' // 内部错误
    | 'not_found'; // 工具未找到
  /** 可重试标志 */
  retryable: boolean;
}

/** 工具执行结果（执行器返回的完整结果） */
export interface ToolExecutionResult {
  /** 执行唯一ID */
  executionId: string;
  /** 工具名称 */
  toolName: string;
  /** 是否成功 */
  success: boolean;
  /** 输出数据（成功时） */
  output?: unknown;
  /** 错误信息（失败时） */
  error?: ToolExecutionError;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** Token使用量 */
  tokens: number;
  /** 是否需要用户确认（未确认时不执行） */
  requiresUserConfirmation?: boolean;
  /** 确认令牌（需要确认时返回） */
  confirmationToken?: string;
  /** 确认要求详情 */
  confirmationRequirement?: {
    level: RiskLevel;
    message: string;
    details: Record<string, unknown>;
  };
}

/** 工具执行事件（流式执行） */
export type ToolExecutionEvent =
  | { type: 'start'; executionId: string; toolName: string; timestamp: number }
  | { type: 'progress'; executionId: string; data: unknown; timestamp: number }
  | {
      type: 'confirmation_required';
      executionId: string;
      token: string;
      message: string;
      timestamp: number;
    }
  | { type: 'complete'; executionId: string; result: ToolExecutionResult; timestamp: number }
  | { type: 'error'; executionId: string; error: ToolExecutionError; timestamp: number };

// ============================================================
// 风险确认
// ============================================================

/** 确认令牌信息 */
export interface ConfirmationTokenInfo {
  /** 令牌值 */
  token: string;
  /** 工具名称 */
  toolName: string;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 输入参数哈希 */
  inputHash: string;
  /** 用户ID */
  userId: string;
  /** 会话ID */
  sessionId: string;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 是否已使用 */
  used: boolean;
  /** CA签名（高风险操作） */
  caSignature?: string;
}

/** 风险确认决策 */
export interface RiskConfirmationDecision {
  /** 是否需要确认 */
  requiresConfirmation: boolean;
  /** 确认级别 */
  confirmationLevel: 'none' | 'single' | 'double';
  /** 是否需要CA签名 */
  requiresCASign: boolean;
  /** 确认消息 */
  message: string;
}
