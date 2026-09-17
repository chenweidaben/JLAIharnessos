/**
 * 健澜科技数智医院智能体 - security/auth/PermissionMatrix.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 权限矩阵
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义模块×操作的权限矩阵，以及角色×模块×操作的完整权限映射。
 *
 * @module security/auth/PermissionMatrix
 */

import {
  DataScope,
  PermissionAction,
  type PermissionKey,
  PermissionModule,
  RoleCode,
} from '../types';
import { getUserPermissions } from './RoleDefinitions';

/**
 * 模块定义
 */
export const MODULE_DEFINITIONS: Record<PermissionModule, { name: string; description: string }> = {
  [PermissionModule.PATIENT]: {
    name: '患者管理',
    description: '患者信息查询、建档、修改、导出',
  },
  [PermissionModule.EMR]: {
    name: '电子病历',
    description: '病历查阅、书写、修改、删除、签名、打印',
  },
  [PermissionModule.ORDER]: {
    name: '医嘱管理',
    description: '医嘱开具、取消、执行、审核、查看',
  },
  [PermissionModule.PRESCRIPTION]: {
    name: '处方管理',
    description: '处方开具、审核、调配、查看',
  },
  [PermissionModule.LAB]: {
    name: '检验管理',
    description: '检验申请、结果查看、危急值处理',
  },
  [PermissionModule.IMAGING]: {
    name: '影像管理',
    description: '影像申请、报告查看、影像调阅、AI分析',
  },
  [PermissionModule.CDS]: {
    name: '临床决策',
    description: '诊断建议、鉴别诊断、治疗方案、用药审核',
  },
  [PermissionModule.SYSTEM]: {
    name: '系统管理',
    description: '用户管理、角色管理、配置管理、日志查看、集成管理',
  },
  [PermissionModule.ADMIN]: {
    name: '管理员',
    description: '系统级管理操作',
  },
};

/**
 * 操作定义
 */
export const ACTION_DEFINITIONS: Record<PermissionAction, { name: string; description: string }> = {
  [PermissionAction.READ]: { name: '读取', description: '查看/查询数据' },
  [PermissionAction.CREATE]: { name: '创建', description: '新增数据/记录' },
  [PermissionAction.UPDATE]: { name: '更新', description: '修改数据/记录' },
  [PermissionAction.DELETE]: { name: '删除', description: '删除数据/记录' },
  [PermissionAction.AUDIT]: { name: '审计', description: '审计/审核操作' },
  [PermissionAction.EXPORT]: { name: '导出', description: '导出数据' },
  [PermissionAction.APPROVE]: { name: '审批', description: '审批/确认操作' },
};

/**
 * 数据范围层级（数字越大范围越广）
 */
export const DATA_SCOPE_LEVEL: Record<DataScope, number> = {
  [DataScope.SELF]: 0,
  [DataScope.ASSIGNED]: 1,
  [DataScope.GROUP]: 2,
  [DataScope.DEPARTMENT]: 3,
  [DataScope.HOSPITAL]: 4,
  [DataScope.AUTHORIZED]: 2, // 授权数据视为组级
};

/**
 * 权限矩阵项
 */
export interface PermissionMatrixEntry {
  module: PermissionModule;
  action: PermissionAction;
  /** 允许的角色列表 */
  allowedRoles: RoleCode[];
  /** 默认数据范围 */
  defaultScope: DataScope;
  /** 是否需要MFA */
  requireMfa?: boolean;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 完整权限矩阵（模块×操作）
 */
export const PERMISSION_MATRIX: PermissionMatrixEntry[] = [
  // ===== 患者管理 =====
  {
    module: PermissionModule.PATIENT,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.SYSTEM_ADMIN,
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.VISITING_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.PHARMACIST,
      RoleCode.TECHNICIAN,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.DEPARTMENT,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.PATIENT,
    action: PermissionAction.CREATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.NURSE,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.PATIENT,
    action: PermissionAction.UPDATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.PATIENT,
    action: PermissionAction.EXPORT,
    allowedRoles: [RoleCode.DEPARTMENT_HEAD, RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.DEPARTMENT,
    requireMfa: true,
    riskLevel: 'high',
  },

  // ===== 电子病历 =====
  {
    module: PermissionModule.EMR,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.SYSTEM_ADMIN,
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.VISITING_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.PHARMACIST,
      RoleCode.TECHNICIAN,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.DEPARTMENT,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.EMR,
    action: PermissionAction.CREATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.VISITING_PHYSICIAN,
      RoleCode.NURSE,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'medium',
  },
  {
    module: PermissionModule.EMR,
    action: PermissionAction.UPDATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'medium',
  },
  {
    module: PermissionModule.EMR,
    action: PermissionAction.DELETE,
    allowedRoles: [RoleCode.DEPARTMENT_HEAD, RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.DEPARTMENT,
    requireMfa: true,
    riskLevel: 'critical',
  },
  {
    module: PermissionModule.EMR,
    action: PermissionAction.AUDIT,
    allowedRoles: [RoleCode.DEPARTMENT_HEAD, RoleCode.CHIEF_PHYSICIAN, RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.DEPARTMENT,
    riskLevel: 'low',
  },

  // ===== 医嘱管理 =====
  {
    module: PermissionModule.ORDER,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.PHARMACIST,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.ORDER,
    action: PermissionAction.CREATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'high',
  },
  {
    module: PermissionModule.ORDER,
    action: PermissionAction.UPDATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.NURSE,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'high',
  },
  {
    module: PermissionModule.ORDER,
    action: PermissionAction.APPROVE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
    ],
    defaultScope: DataScope.DEPARTMENT,
    riskLevel: 'high',
  },

  // ===== 处方管理 =====
  {
    module: PermissionModule.PRESCRIPTION,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.PHARMACIST,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.PRESCRIPTION,
    action: PermissionAction.CREATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
    ],
    defaultScope: DataScope.GROUP,
    requireMfa: true,
    riskLevel: 'high',
  },
  {
    module: PermissionModule.PRESCRIPTION,
    action: PermissionAction.AUDIT,
    allowedRoles: [RoleCode.PHARMACIST, RoleCode.DEPARTMENT_HEAD],
    defaultScope: DataScope.HOSPITAL,
    riskLevel: 'medium',
  },
  {
    module: PermissionModule.PRESCRIPTION,
    action: PermissionAction.APPROVE,
    allowedRoles: [RoleCode.DEPARTMENT_HEAD, RoleCode.CHIEF_PHYSICIAN],
    defaultScope: DataScope.DEPARTMENT,
    riskLevel: 'high',
  },

  // ===== 检验管理 =====
  {
    module: PermissionModule.LAB,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.VISITING_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.TECHNICIAN,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.LAB,
    action: PermissionAction.CREATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.TECHNICIAN,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'medium',
  },
  {
    module: PermissionModule.LAB,
    action: PermissionAction.UPDATE,
    allowedRoles: [RoleCode.TECHNICIAN, RoleCode.DEPARTMENT_HEAD],
    defaultScope: DataScope.HOSPITAL,
    riskLevel: 'medium',
  },

  // ===== 影像管理 =====
  {
    module: PermissionModule.IMAGING,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.VISITING_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.TECHNICIAN,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.IMAGING,
    action: PermissionAction.CREATE,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.TECHNICIAN,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'medium',
  },
  {
    module: PermissionModule.IMAGING,
    action: PermissionAction.UPDATE,
    allowedRoles: [RoleCode.TECHNICIAN, RoleCode.DEPARTMENT_HEAD],
    defaultScope: DataScope.HOSPITAL,
    riskLevel: 'medium',
  },

  // ===== 临床决策 =====
  {
    module: PermissionModule.CDS,
    action: PermissionAction.READ,
    allowedRoles: [
      RoleCode.DEPARTMENT_HEAD,
      RoleCode.CHIEF_PHYSICIAN,
      RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
      RoleCode.ATTENDING_PHYSICIAN,
      RoleCode.RESIDENT_PHYSICIAN,
      RoleCode.VISITING_PHYSICIAN,
      RoleCode.NURSE,
      RoleCode.PHARMACIST,
      RoleCode.TECHNICIAN,
      RoleCode.PATIENT,
    ],
    defaultScope: DataScope.GROUP,
    riskLevel: 'low',
  },

  // ===== 系统管理 =====
  {
    module: PermissionModule.SYSTEM,
    action: PermissionAction.READ,
    allowedRoles: [RoleCode.SYSTEM_ADMIN, RoleCode.DEPARTMENT_HEAD],
    defaultScope: DataScope.HOSPITAL,
    riskLevel: 'low',
  },
  {
    module: PermissionModule.SYSTEM,
    action: PermissionAction.CREATE,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    requireMfa: true,
    riskLevel: 'high',
  },
  {
    module: PermissionModule.SYSTEM,
    action: PermissionAction.UPDATE,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    requireMfa: true,
    riskLevel: 'high',
  },
  {
    module: PermissionModule.SYSTEM,
    action: PermissionAction.DELETE,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    requireMfa: true,
    riskLevel: 'critical',
  },
  {
    module: PermissionModule.SYSTEM,
    action: PermissionAction.AUDIT,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    riskLevel: 'medium',
  },

  // ===== 管理员 =====
  {
    module: PermissionModule.ADMIN,
    action: PermissionAction.READ,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    riskLevel: 'medium',
  },
  {
    module: PermissionModule.ADMIN,
    action: PermissionAction.CREATE,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    requireMfa: true,
    riskLevel: 'critical',
  },
  {
    module: PermissionModule.ADMIN,
    action: PermissionAction.UPDATE,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    requireMfa: true,
    riskLevel: 'critical',
  },
  {
    module: PermissionModule.ADMIN,
    action: PermissionAction.DELETE,
    allowedRoles: [RoleCode.SYSTEM_ADMIN],
    defaultScope: DataScope.HOSPITAL,
    requireMfa: true,
    riskLevel: 'critical',
  },
];

/**
 * 构建角色×模块×操作的权限查找表
 *
 * @param roleCodes - 角色列表
 * @returns 权限集合
 */
export function buildPermissionLookup(roleCodes: RoleCode[]): Set<PermissionKey> {
  return getUserPermissions(roleCodes);
}

/**
 * 检查角色是否拥有指定模块和操作的权限（不考虑数据范围）
 *
 * @param roleCode - 角色编码
 * @param module - 模块
 * @param action - 操作
 * @returns 是否有权限
 */
export function hasModuleActionPermission(
  roleCode: RoleCode,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  const entry = PERMISSION_MATRIX.find((e) => e.module === module && e.action === action);
  if (!entry) return false;
  return entry.allowedRoles.includes(roleCode);
}

/**
 * 获取权限矩阵条目
 *
 * @param module - 模块
 * @param action - 操作
 * @returns 权限矩阵条目（如存在）
 */
export function getMatrixEntry(
  module: PermissionModule,
  action: PermissionAction,
): PermissionMatrixEntry | undefined {
  return PERMISSION_MATRIX.find((e) => e.module === module && e.action === action);
}
