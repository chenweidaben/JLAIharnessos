/**
 * 健澜科技数智医院智能体 - security/auth/RoleDefinitions.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 角色定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件定义12种系统角色，包括每个角色的权限列表、数据范围和角色继承关系。
 * 基于RBAC（基于角色的访问控制）模型设计。
 *
 * @module security/auth/RoleDefinitions
 */

import {
  DataScope,
  PermissionAction,
  type PermissionKey,
  PermissionModule,
  RoleCode,
  type RoleDefinition,
} from '../types';

/**
 * 辅助函数：构建权限键
 */
function perm(module: PermissionModule, action: PermissionAction, scope: DataScope): PermissionKey {
  return `${module}:${action}:${scope}`;
}

/**
 * 辅助函数：为模块生成所有操作的权限
 */
function moduleAllActions(
  module: PermissionModule,
  actions: PermissionAction[],
  scope: DataScope,
): PermissionKey[] {
  return actions.map((a) => perm(module, a, scope));
}

// 常用操作集
const READ_ONLY: PermissionAction[] = [PermissionAction.READ];
const READ_WRITE: PermissionAction[] = [
  PermissionAction.READ,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
];
const ALL_ACTIONS: PermissionAction[] = [
  PermissionAction.READ,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
  PermissionAction.AUDIT,
  PermissionAction.EXPORT,
  PermissionAction.APPROVE,
];

/**
 * 系统管理员角色
 * 系统配置、用户管理、权限分配、集成接口管理、部署运维
 */
export const SYSTEM_ADMIN_ROLE: RoleDefinition = {
  code: RoleCode.SYSTEM_ADMIN,
  name: '系统管理员',
  description: '负责系统配置、用户管理、权限分配、集成接口管理和部署运维，无患者诊疗操作权限',
  permissions: [
    ...moduleAllActions(PermissionModule.SYSTEM, ALL_ACTIONS, DataScope.HOSPITAL),
    ...moduleAllActions(PermissionModule.ADMIN, ALL_ACTIONS, DataScope.HOSPITAL),
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.HOSPITAL),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.HOSPITAL),
    perm(PermissionModule.EMR, PermissionAction.AUDIT, DataScope.HOSPITAL),
  ],
  defaultDataScope: DataScope.HOSPITAL,
  requireMfa: true,
};

/**
 * 科主任角色
 * 科室质量管理、诊疗规范制定、质控规则配置、科室数据分析、科室权限管理
 */
export const DEPARTMENT_HEAD_ROLE: RoleDefinition = {
  code: RoleCode.DEPARTMENT_HEAD,
  name: '科主任',
  description: '负责科室质量管理、诊疗规范制定、质控规则配置、科室数据分析和科室权限管理',
  permissions: [
    ...moduleAllActions(PermissionModule.PATIENT, READ_WRITE, DataScope.DEPARTMENT),
    perm(PermissionModule.PATIENT, PermissionAction.EXPORT, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.EMR, ALL_ACTIONS, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.ORDER, ALL_ACTIONS, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.PRESCRIPTION, READ_WRITE, DataScope.DEPARTMENT),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.APPROVE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.CDS, READ_ONLY, DataScope.DEPARTMENT),
    perm(PermissionModule.SYSTEM, PermissionAction.READ, DataScope.DEPARTMENT),
  ],
  defaultDataScope: DataScope.DEPARTMENT,
  inheritsFrom: [RoleCode.CHIEF_PHYSICIAN],
  requireMfa: true,
};

/**
 * 主任医师角色
 * 疑难病例诊疗、三级查房、会诊指导、带教
 */
export const CHIEF_PHYSICIAN_ROLE: RoleDefinition = {
  code: RoleCode.CHIEF_PHYSICIAN,
  name: '主任医师',
  description: '负责疑难病例诊疗、三级查房、会诊指导和带教',
  permissions: [
    ...moduleAllActions(PermissionModule.PATIENT, READ_WRITE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.EMR, READ_WRITE, DataScope.DEPARTMENT),
    perm(PermissionModule.EMR, PermissionAction.AUDIT, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.ORDER, ALL_ACTIONS, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.PRESCRIPTION, READ_WRITE, DataScope.DEPARTMENT),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.APPROVE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.CDS, READ_ONLY, DataScope.DEPARTMENT),
  ],
  defaultDataScope: DataScope.DEPARTMENT,
  inheritsFrom: [RoleCode.ASSOCIATE_CHIEF_PHYSICIAN],
};

/**
 * 副主任医师角色
 * 临床诊疗、二级查房、疑难病例处理
 */
export const ASSOCIATE_CHIEF_PHYSICIAN_ROLE: RoleDefinition = {
  code: RoleCode.ASSOCIATE_CHIEF_PHYSICIAN,
  name: '副主任医师',
  description: '负责临床诊疗、二级查房和疑难病例处理',
  permissions: [
    ...moduleAllActions(PermissionModule.PATIENT, READ_WRITE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.EMR, READ_WRITE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.ORDER, READ_WRITE, DataScope.DEPARTMENT),
    perm(PermissionModule.ORDER, PermissionAction.APPROVE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.PRESCRIPTION, READ_WRITE, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.CDS, READ_ONLY, DataScope.DEPARTMENT),
  ],
  defaultDataScope: DataScope.DEPARTMENT,
  inheritsFrom: [RoleCode.ATTENDING_PHYSICIAN],
};

/**
 * 主治医师角色
 * 日常诊疗、一级查房、病历书写、医嘱开具
 */
export const ATTENDING_PHYSICIAN_ROLE: RoleDefinition = {
  code: RoleCode.ATTENDING_PHYSICIAN,
  name: '主治医师',
  description: '负责日常诊疗、一级查房、病历书写和医嘱开具',
  permissions: [
    ...moduleAllActions(PermissionModule.PATIENT, READ_WRITE, DataScope.GROUP),
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.EMR, READ_WRITE, DataScope.GROUP),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.ORDER, READ_WRITE, DataScope.GROUP),
    ...moduleAllActions(PermissionModule.PRESCRIPTION, READ_WRITE, DataScope.GROUP),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.GROUP),
    perm(PermissionModule.LAB, PermissionAction.READ, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.GROUP),
    perm(PermissionModule.IMAGING, PermissionAction.READ, DataScope.DEPARTMENT),
    ...moduleAllActions(PermissionModule.CDS, READ_ONLY, DataScope.GROUP),
  ],
  defaultDataScope: DataScope.GROUP,
  inheritsFrom: [RoleCode.RESIDENT_PHYSICIAN],
};

/**
 * 住院医师角色
 * 基础诊疗、病历书写、值班、患者管理
 */
export const RESIDENT_PHYSICIAN_ROLE: RoleDefinition = {
  code: RoleCode.RESIDENT_PHYSICIAN,
  name: '住院医师',
  description: '负责基础诊疗、病历书写、值班和患者管理，医嘱需上级审核',
  permissions: [
    ...moduleAllActions(PermissionModule.PATIENT, READ_WRITE, DataScope.ASSIGNED),
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.GROUP),
    ...moduleAllActions(PermissionModule.EMR, READ_WRITE, DataScope.ASSIGNED),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.GROUP),
    perm(PermissionModule.ORDER, PermissionAction.CREATE, DataScope.ASSIGNED),
    perm(PermissionModule.ORDER, PermissionAction.READ, DataScope.ASSIGNED),
    perm(PermissionModule.ORDER, PermissionAction.UPDATE, DataScope.ASSIGNED),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.CREATE, DataScope.ASSIGNED),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.READ, DataScope.ASSIGNED),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.ASSIGNED),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.ASSIGNED),
    ...moduleAllActions(PermissionModule.CDS, READ_ONLY, DataScope.ASSIGNED),
  ],
  defaultDataScope: DataScope.ASSIGNED,
};

/**
 * 进修医师角色
 * 学习培训、辅助诊疗（受限）
 */
export const VISITING_PHYSICIAN_ROLE: RoleDefinition = {
  code: RoleCode.VISITING_PHYSICIAN,
  name: '进修医师',
  description: '学习培训和辅助诊疗，权限受限，无独立医嘱权，病历需带教审核',
  permissions: [
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.AUTHORIZED),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.AUTHORIZED),
    perm(PermissionModule.EMR, PermissionAction.CREATE, DataScope.AUTHORIZED),
    perm(PermissionModule.LAB, PermissionAction.READ, DataScope.AUTHORIZED),
    perm(PermissionModule.IMAGING, PermissionAction.READ, DataScope.AUTHORIZED),
    perm(PermissionModule.CDS, PermissionAction.READ, DataScope.AUTHORIZED),
  ],
  defaultDataScope: DataScope.AUTHORIZED,
};

/**
 * 护士角色
 * 患者信息核对、护理记录、医嘱执行、随访
 */
export const NURSE_ROLE: RoleDefinition = {
  code: RoleCode.NURSE,
  name: '护士',
  description: '负责患者信息核对、护理记录、医嘱执行和随访',
  permissions: [
    ...moduleAllActions(PermissionModule.PATIENT, READ_ONLY, DataScope.GROUP),
    perm(PermissionModule.PATIENT, PermissionAction.UPDATE, DataScope.GROUP),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.GROUP),
    perm(PermissionModule.EMR, PermissionAction.CREATE, DataScope.GROUP),
    perm(PermissionModule.ORDER, PermissionAction.READ, DataScope.GROUP),
    perm(PermissionModule.ORDER, PermissionAction.UPDATE, DataScope.GROUP),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.GROUP),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.GROUP),
    perm(PermissionModule.CDS, PermissionAction.READ, DataScope.GROUP),
  ],
  defaultDataScope: DataScope.GROUP,
};

/**
 * 药师角色
 * 处方审核、用药指导、药品管理
 */
export const PHARMACIST_ROLE: RoleDefinition = {
  code: RoleCode.PHARMACIST,
  name: '药师',
  description: '负责处方审核、用药指导和药品管理，无处方开具权',
  permissions: [
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.HOSPITAL),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.HOSPITAL),
    perm(PermissionModule.ORDER, PermissionAction.READ, DataScope.HOSPITAL),
    ...moduleAllActions(PermissionModule.PRESCRIPTION, READ_ONLY, DataScope.HOSPITAL),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.AUDIT, DataScope.HOSPITAL),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.UPDATE, DataScope.HOSPITAL),
    perm(PermissionModule.CDS, PermissionAction.READ, DataScope.HOSPITAL),
  ],
  defaultDataScope: DataScope.HOSPITAL,
};

/**
 * 技师角色
 * 检验/检查操作、报告审核、设备管理
 */
export const TECHNICIAN_ROLE: RoleDefinition = {
  code: RoleCode.TECHNICIAN,
  name: '技师',
  description: '负责检验检查操作、报告审核和设备管理，无诊疗处方权',
  permissions: [
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.HOSPITAL),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.HOSPITAL),
    ...moduleAllActions(PermissionModule.LAB, READ_ONLY, DataScope.HOSPITAL),
    perm(PermissionModule.LAB, PermissionAction.CREATE, DataScope.HOSPITAL),
    perm(PermissionModule.LAB, PermissionAction.UPDATE, DataScope.HOSPITAL),
    ...moduleAllActions(PermissionModule.IMAGING, READ_ONLY, DataScope.HOSPITAL),
    perm(PermissionModule.IMAGING, PermissionAction.CREATE, DataScope.HOSPITAL),
    perm(PermissionModule.IMAGING, PermissionAction.UPDATE, DataScope.HOSPITAL),
    perm(PermissionModule.CDS, PermissionAction.READ, DataScope.HOSPITAL),
  ],
  defaultDataScope: DataScope.HOSPITAL,
};

/**
 * 患者角色
 * 个人健康信息查看、随访、健康咨询
 */
export const PATIENT_ROLE: RoleDefinition = {
  code: RoleCode.PATIENT,
  name: '患者',
  description: '可查看本人健康信息、随访任务和健康咨询',
  permissions: [
    perm(PermissionModule.PATIENT, PermissionAction.READ, DataScope.SELF),
    perm(PermissionModule.PATIENT, PermissionAction.UPDATE, DataScope.SELF),
    perm(PermissionModule.EMR, PermissionAction.READ, DataScope.SELF),
    perm(PermissionModule.ORDER, PermissionAction.READ, DataScope.SELF),
    perm(PermissionModule.PRESCRIPTION, PermissionAction.READ, DataScope.SELF),
    perm(PermissionModule.LAB, PermissionAction.READ, DataScope.SELF),
    perm(PermissionModule.IMAGING, PermissionAction.READ, DataScope.SELF),
    perm(PermissionModule.CDS, PermissionAction.READ, DataScope.SELF),
  ],
  defaultDataScope: DataScope.SELF,
};

/**
 * 访客角色
 * 仅可访问公开信息
 */
export const GUEST_ROLE: RoleDefinition = {
  code: RoleCode.GUEST,
  name: '访客',
  description: '仅可访问公开信息，无任何患者数据访问权限',
  permissions: [],
  defaultDataScope: DataScope.SELF,
};

/**
 * 所有角色定义映射
 */
export const ROLE_DEFINITIONS: Map<RoleCode, RoleDefinition> = new Map<RoleCode, RoleDefinition>([
  [RoleCode.SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE],
  [RoleCode.DEPARTMENT_HEAD, DEPARTMENT_HEAD_ROLE],
  [RoleCode.CHIEF_PHYSICIAN, CHIEF_PHYSICIAN_ROLE],
  [RoleCode.ASSOCIATE_CHIEF_PHYSICIAN, ASSOCIATE_CHIEF_PHYSICIAN_ROLE],
  [RoleCode.ATTENDING_PHYSICIAN, ATTENDING_PHYSICIAN_ROLE],
  [RoleCode.RESIDENT_PHYSICIAN, RESIDENT_PHYSICIAN_ROLE],
  [RoleCode.VISITING_PHYSICIAN, VISITING_PHYSICIAN_ROLE],
  [RoleCode.NURSE, NURSE_ROLE],
  [RoleCode.PHARMACIST, PHARMACIST_ROLE],
  [RoleCode.TECHNICIAN, TECHNICIAN_ROLE],
  [RoleCode.PATIENT, PATIENT_ROLE],
  [RoleCode.GUEST, GUEST_ROLE],
]);

/**
 * 获取角色定义（含继承的权限）
 *
 * @param roleCode - 角色编码
 * @returns 角色定义（含继承的所有权限）
 */
export function getRoleDefinition(roleCode: RoleCode): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.get(roleCode);
}

/**
 * 获取角色的所有权限（含继承链）
 *
 * @param roleCode - 角色编码
 * @returns 权限集合（去重）
 */
export function getRolePermissions(roleCode: RoleCode): Set<PermissionKey> {
  const permissions = new Set<PermissionKey>();
  const visited = new Set<RoleCode>();

  function collect(code: RoleCode): void {
    if (visited.has(code)) return;
    visited.add(code);
    const role = ROLE_DEFINITIONS.get(code);
    if (!role) return;
    for (const p of role.permissions) {
      permissions.add(p);
    }
    if (role.inheritsFrom) {
      for (const parentCode of role.inheritsFrom) {
        collect(parentCode);
      }
    }
  }

  collect(roleCode);
  return permissions;
}

/**
 * 获取用户所有角色的合并权限
 *
 * @param roleCodes - 角色编码列表
 * @returns 合并后的权限集合
 */
export function getUserPermissions(roleCodes: RoleCode[]): Set<PermissionKey> {
  const allPermissions = new Set<PermissionKey>();
  for (const code of roleCodes) {
    const perms = getRolePermissions(code);
    for (const p of perms) {
      allPermissions.add(p);
    }
  }
  return allPermissions;
}
