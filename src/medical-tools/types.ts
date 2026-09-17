/**
 * 健澜科技数智医院智能体 - 医疗工具最小类型定义
 *
 * 本文件定义医疗工具所需的最小类型接口。
 * 核心团队完成 src/core/tools/ 后，本文件将被统一替换。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { z } from 'zod';

// ============================================================================
// 枚举与基础类型
// ============================================================================

/** 医疗工具分类 */
export enum MedicalToolCategory {
  PATIENT = 'patient',
  EMR = 'emr',
  ORDER = 'order',
  PRESCRIPTION = 'prescription',
  LAB = 'lab',
  IMAGING = 'imaging',
  CDS = 'cds',
  INTEGRATION = 'integration',
  QC = 'qc',
  KNOWLEDGE = 'knowledge',
}

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 医疗角色 */
export type MedicalRole =
  'doctor' | 'nurse' | 'pharmacist' | 'admin' | 'patient' | 'technician' | 'researcher';

/** 就诊类型 */
export type VisitType = 'outpatient' | 'emergency' | 'inpatient' | 'physical_exam' | 'followup';

// ============================================================================
// 工具执行结果
// ============================================================================

/** 工具执行结果包装 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// 用户与患者上下文
// ============================================================================

/** 医疗用户信息 */
export interface MedicalUser {
  userId: string;
  name: string;
  role: MedicalRole;
  title?: string;
  department: string;
  licenseNo?: string;
  prescription权: boolean;
  prescription权Level?: 'normal' | 'special' | 'narcotic';
  permissions: string[];
  loginTime: number;
  sessionId: string;
}

/** 患者上下文 */
export interface PatientContext {
  patientId: string | null;
  encounterId: string | null;
  department: string;
  visitType: VisitType;
  isEmergency: boolean;
  allergyHistory?: string[];
  currentMedications?: string[];
}

// ============================================================================
// 安全组件（最小接口）
// ============================================================================

/** 审计日志条目 */
export interface AuditLogEntry {
  timestamp: number;
  userId: string;
  userName: string;
  role: MedicalRole;
  toolName: string;
  patientId: string | null;
  encounterId: string | null;
  input: unknown;
  outputSummary: string;
  ipAddress: string;
  traceId: string;
}

/** 审计器（最小接口） */
export interface MedicalAuditor {
  log(entry: AuditLogEntry): void;
}

/** 数据脱敏器（最小接口） */
export interface DataDesensitizer {
  desensitize<T>(data: T): T;
  maskIdCard(idCard: string): string;
  maskPhone(phone: string): string;
  maskName(name: string): string;
}

/** 权限检查器（最小接口） */
export interface MedicalPermissionChecker {
  hasPermission(user: MedicalUser, permission: string): boolean;
}

// ============================================================================
// 医疗工具执行上下文
// ============================================================================

/**
 * 医疗工具执行上下文
 * 基于 claude-code ToolUseContext 扩展，贯穿整个工具调用链
 */
export interface MedicalToolContext {
  // === 用户信息 ===
  medicalUser: MedicalUser;

  // === 患者上下文 ===
  patientContext: PatientContext;

  // === 安全组件 ===
  security: {
    auditor: MedicalAuditor;
    desensitizer: DataDesensitizer;
    permissionChecker: MedicalPermissionChecker;
    emergencyOverride: boolean;
  };

  // === 执行控制 ===
  execution: {
    timeoutMs: number;
    maxRetries: number;
    traceId: string;
    clientIp: string;
  };

  // === 确认回调 ===
  confirmation: {
    requestUserConfirm(message: string, details: Record<string, unknown>): Promise<boolean>;
    requestDoubleConfirm(
      message: string,
      details: Record<string, unknown>,
      reviewerRole?: string,
    ): Promise<boolean>;
  };
}

// ============================================================================
// 医疗校验与权限结果
// ============================================================================

/** 医疗校验结果 */
export interface MedicalValidationResult {
  valid: boolean;
  errors: {
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }[];
}

/** 医疗权限结果 */
export interface MedicalPermissionResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: string;
  suggestedAction?: string;
}

// ============================================================================
// 医疗工具定义
// ============================================================================

/**
 * 医疗工具定义接口
 * 基于 claude-code Tool 类型扩展，增加医疗安全属性
 */
export interface MedicalToolDefinition {
  // === 标识 ===
  readonly name: string;
  readonly description: string;
  readonly category: MedicalToolCategory;
  readonly aliases?: string[];

  // === 风险与权限 ===
  readonly riskLevel: RiskLevel;
  readonly requiresAuth: boolean;
  readonly requiresConfirm: boolean;
  readonly requiresDoubleConfirm?: boolean;
  readonly requiredPermissions: string[];
  readonly requiredRoles?: MedicalRole[];
  readonly requiredTitles?: string[];

  // === Schema ===
  readonly inputSchema: z.ZodType;
  readonly outputSchema: z.ZodType;

  // === 执行入口 ===
  execute(input: unknown, context: MedicalToolContext): Promise<ToolResult<unknown>>;

  // === 能力标记 ===
  isConcurrencySafe?(input: unknown): boolean;
  isEnabled?(): boolean;
  isReadOnly?(input: unknown): boolean;
  isDestructive?(input: unknown): boolean;

  // === 医疗专用方法 ===
  validateMedicalInput?(
    input: unknown,
    context: MedicalToolContext,
  ): Promise<MedicalValidationResult>;

  checkMedicalPermissions?(
    input: unknown,
    context: MedicalToolContext,
  ): Promise<MedicalPermissionResult>;

  getAuditLogEntry?(input: unknown, output: unknown, context: MedicalToolContext): AuditLogEntry;

  // === UI 渲染 ===
  userFacingName?(input: unknown): string;
  getActivityDescription?(input: unknown): string | null;
}

/** 构建后的医疗工具（包含默认值） */
export type BuiltMedicalTool<D extends MedicalToolDefinition> = D & {
  isEnabled: () => boolean;
  isConcurrencySafe: (input: unknown) => boolean;
  isReadOnly: (input: unknown) => boolean;
  isDestructive: (input: unknown) => boolean;
  requiresAuth: boolean;
  requiresConfirm: boolean;
  requiresDoubleConfirm: boolean;
  validateMedicalInput: (
    input: unknown,
    context: MedicalToolContext,
  ) => Promise<MedicalValidationResult>;
  checkMedicalPermissions: (
    input: unknown,
    context: MedicalToolContext,
  ) => Promise<MedicalPermissionResult>;
};

// ============================================================================
// 工具注册表
// ============================================================================

/** 医疗工具注册表 */
export interface MedicalToolRegistry {
  register(tool: MedicalToolDefinition): void;
  get(name: string): MedicalToolDefinition | undefined;
  getAll(): MedicalToolDefinition[];
  getByCategory(category: MedicalToolCategory): MedicalToolDefinition[];
  has(name: string): boolean;
  size: number;
}
