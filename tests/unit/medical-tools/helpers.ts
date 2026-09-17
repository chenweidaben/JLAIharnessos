/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试辅助 - 医疗工具执行上下文构造
 */

import type { MedicalRole, MedicalToolContext } from '@/medical-tools/types.js';

/**
 * 构造医疗工具测试执行上下文（统一入口）
 *
 * @param opts.role - 执行角色，默认 doctor；用于身份/权限校验场景
 * @param opts.name - 用户名
 * @param opts.prescriptionRight - 是否具备处方权，默认 true
 * @param opts.permissions - 权限集合
 */
export function createMedicalToolContext(
  opts: {
    role?: MedicalRole;
    name?: string;
    prescriptionRight?: boolean;
    permissions?: string[];
  } = {},
): MedicalToolContext {
  const role = opts.role ?? 'doctor';
  const defaultName = role === 'pharmacist' ? '测试医师' : '测试医生';
  const ctx = makeDoctorContext(opts.name ?? defaultName);
  const medicalUser = ctx.medicalUser as {
    role: MedicalRole;
    prescription权: boolean;
    permissions: string[];
  };
  medicalUser.role = role;
  if (opts.prescriptionRight === false) {
    medicalUser.prescription权 = false;
  }
  if (opts.permissions) {
    medicalUser.permissions = opts.permissions;
  }
  return ctx;
}

/** 构造最小可用的医师执行上下文（用于需医师身份的写操作工具） */
export function makeDoctorContext(name = '测试医生'): MedicalToolContext {
  return {
    medicalUser: {
      userId: 'DOC_TEST',
      name,
      role: 'doctor',
      department: '内科',
      permissions: ['order:create', 'order:cancel', 'order:audit', 'lab:order', 'imaging:order'],
      prescription权: true,
      loginTime: Date.now(),
      sessionId: 'test-session',
    },
    patientContext: {
      patientId: null,
      encounterId: null,
      department: '内科',
      visitType: 'outpatient',
      isEmergency: false,
    },
    security: {
      auditor: { log: () => {} },
      desensitizer: {
        desensitize: <T>(d: T): T => d,
        maskIdCard: (s: string) => s,
        maskPhone: (s: string) => s,
        maskName: (s: string) => s,
      },
      permissionChecker: { hasPermission: () => true },
      emergencyOverride: false,
    },
    execution: { timeoutMs: 5000, maxRetries: 0, traceId: 'trace-test', clientIp: '127.0.0.1' },
    confirmation: {
      requestUserConfirm: async () => true,
      requestDoubleConfirm: async () => true,
    },
  } as unknown as MedicalToolContext;
}

/** 构造最小可用的护士执行上下文（用于身份校验失败场景） */
export function makeNurseContext(): MedicalToolContext {
  const ctx = makeDoctorContext();
  (ctx.medicalUser as { role: string }).role = 'nurse';
  return ctx;
}

/** 空上下文（用于不校验身份的只读工具） */
export const emptyCtx = {} as MedicalToolContext;
