/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 测试辅助工具 - 创建测试用的 Mock 对象
 */

import type {
  MedicalUser,
  MedicalToolContext,
  AuditLogger,
  AuditLogEntry,
  PermissionChecker,
  PermissionCheckResult,
  MedicalConfig,
  ConfirmationCallbacks,
  PatientSummary,
  EncounterSummary,
} from '@/types';

/**
 * 创建测试用的 Mock 用户
 */
export function createMockUser(
  overrides: Partial<MedicalUser> = {},
): MedicalUser {
  return {
    userId: 'test_user_001',
    name: '测试医生',
    role: 'doctor',
    title: 'attending',
    department: 'cardiology',
    licenseNo: 'TEST123456',
    hasPrescriptionRight: true,
    prescriptionRightLevel: 'normal',
    permissions: ['patient:read', 'patient:write', 'emr:read', 'emr:write'],
    loginTime: Date.now(),
    sessionId: 'test_session_001',
    clientIp: '127.0.0.1',
    ...overrides,
  };
}

/**
 * 创建测试用的 Mock 患者摘要
 */
export function createMockPatient(
  overrides: Partial<PatientSummary> = {},
): PatientSummary {
  return {
    patientId: 'P202409001',
    name: '张*三',
    gender: 'male',
    age: 58,
    medicalRecordNo: 'MR001',
    department: 'cardiology',
    currentDiagnosis: '冠心病',
    status: 'hospitalized',
    allergySummary: '青霉素过敏',
    isEmergency: false,
    lastVisitDate: '2024-09-01',
    ...overrides,
  };
}

/**
 * 创建测试用的 Mock 就诊摘要
 */
export function createMockEncounter(
  overrides: Partial<EncounterSummary> = {},
): EncounterSummary {
  return {
    encounterId: 'E202409001',
    patientId: 'P202409001',
    visitType: 'inpatient',
    department: 'cardiology',
    doctorId: 'test_user_001',
    doctorName: '测试医生',
    status: 'in_progress',
    chiefComplaint: '胸闷胸痛3天',
    preliminaryDiagnosis: '冠心病 不稳定型心绞痛',
    startTime: '2024-09-01T08:00:00Z',
    bedNo: '1203-5',
    ...overrides,
  };
}

/**
 * 创建测试用的 Mock 审计日志器
 */
export function createMockAuditLogger(): AuditLogger & {
  entries: AuditLogEntry[];
} {
  const entries: AuditLogEntry[] = [];
  return {
    entries,
    async log(entry: AuditLogEntry): Promise<void> {
      entries.push(entry);
    },
    async logBatch(entriesToLog: readonly AuditLogEntry[]): Promise<void> {
      entries.push(...entriesToLog);
    },
  };
}

/**
 * 创建测试用的 Mock 权限检查器
 */
export function createMockPermissionChecker(
  allowedPermissions: string[] = ['*'],
): PermissionChecker {
  return {
    async check(
      user: MedicalUser,
      permission: string,
      _context?: Record<string, unknown>,
    ): Promise<PermissionCheckResult> {
      if (allowedPermissions.includes('*') || allowedPermissions.includes(permission)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `缺少权限: ${permission}`,
        requiredPermission: permission,
      };
    },
    async checkAll(
      user: MedicalUser,
      permissions: readonly string[],
      context?: Record<string, unknown>,
    ): Promise<PermissionCheckResult> {
      for (const perm of permissions) {
        const result = await this.check(user, perm, context);
        if (!result.allowed) return result;
      }
      return { allowed: true };
    },
  };
}

/**
 * 创建测试用的 Mock 确认回调
 */
export function createMockConfirmationCallbacks(
  confirmResult: boolean = true,
): ConfirmationCallbacks & {
  singleConfirmCalls: number;
  doubleConfirmCalls: number;
} {
  let singleConfirmCalls = 0;
  let doubleConfirmCalls = 0;
  return {
    get singleConfirmCalls() {
      return singleConfirmCalls;
    },
    get doubleConfirmCalls() {
      return doubleConfirmCalls;
    },
    async requestUserConfirm(
      _message: string,
      _details: Record<string, unknown>,
    ): Promise<boolean> {
      singleConfirmCalls++;
      return confirmResult;
    },
    async requestDoubleConfirm(
      _message: string,
      _details: Record<string, unknown>,
      _reviewerRole?: string,
    ): Promise<boolean> {
      doubleConfirmCalls++;
      return confirmResult;
    },
  };
}

/**
 * 创建测试用的 Mock 系统配置
 */
export function createMockConfig(
  overrides: Partial<MedicalConfig> = {},
): MedicalConfig {
  return {
    defaultToolTimeoutMs: 30000,
    maxConcurrentTools: 10,
    maxRetries: 1,
    maxResultSizeChars: 30000,
    auditEnabled: true,
    desensitizationEnabled: true,
    emergencyOverrideEnabled: false,
    ...overrides,
  };
}

/**
 * 创建测试用的 Mock 工具执行上下文
 */
export function createMockContext(
  overrides: {
    user?: Partial<MedicalUser>;
    patient?: PatientSummary;
    encounter?: EncounterSummary;
    allowedPermissions?: string[];
    confirmResult?: boolean;
    config?: Partial<MedicalConfig>;
    signal?: AbortSignal;
  } = {},
): MedicalToolContext {
  const user = createMockUser(overrides.user);
  const audit = createMockAuditLogger();
  const permissionChecker = createMockPermissionChecker(
    overrides.allowedPermissions,
  );
  const confirmation = createMockConfirmationCallbacks(
    overrides.confirmResult ?? true,
  );
  const config = createMockConfig(overrides.config);

  const context: MedicalToolContext = {
    user,
    patient: overrides.patient ?? createMockPatient(),
    encounter: overrides.encounter ?? createMockEncounter(),
    sessionId: user.sessionId,
    traceId: 'test_trace_001',
    audit,
    permissionChecker,
    confirmation,
    config,
    signal: overrides.signal,
    timeoutMs: config.defaultToolTimeoutMs,
    emergencyOverride: false,

    async checkPermission(permission: string): Promise<PermissionCheckResult> {
      return permissionChecker.check(user, permission);
    },

    async logAudit(entry: Partial<AuditLogEntry>): Promise<void> {
      await audit.log({
        timestamp: Date.now(),
        userId: user.userId,
        userName: user.name,
        userRole: user.role,
        toolName: entry.toolName ?? 'unknown',
        toolCategory: entry.toolCategory ?? 'unknown',
        riskLevel: entry.riskLevel ?? 'low',
        patientId: entry.patientId,
        encounterId: entry.encounterId,
        input: entry.input ?? {},
        outputSummary: entry.outputSummary,
        success: entry.success ?? true,
        errorMessage: entry.errorMessage,
        durationMs: entry.durationMs ?? 0,
        clientIp: user.clientIp,
        traceId: 'test_trace_001',
        sessionId: user.sessionId,
        confirmation: entry.confirmation,
      });
    },

    getConfig<T = unknown>(key: string): T | undefined {
      return config[key] as T | undefined;
    },

    isAborted(): boolean {
      return overrides.signal?.aborted ?? false;
    },
  };

  return context;
}
