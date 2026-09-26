/**
 * 健澜科技 jlmedaios - 登录用户视图映射
 *
 * 将 iam.users（+ user_roles）映射为前端 AuthUser 契约（web/src/types/auth.ts），
 * 并提供"角色 → 权限码"的规范 RBAC 映射。
 *
 * 说明：开源库的 iam.role_permissions 未预置映射，故角色的规范权限集合在此统一定义
 * （应用层策略）；院方生产部署可在 iam.role_permissions 中维护并改为以库为准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { User, UserRoleLink } from '@/db/repositories/userRepo';

/** 规范角色 → 权限码（对齐 iam.permissions.code，并兼容路由使用的 :view 码） */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'system:admin', 'system:user:view', 'system:role:view', 'system:perm:manage',
    'system:audit:view', 'system:loginlog:view', 'report:view',
    'medical_record:read', 'medical_record:write', 'medical_record:audit',
    'order:write', 'prescription:write', 'prescription:review',
    'lab:read', 'imaging:read', 'imaging:view',
    'agent:build', 'agent:publish', 'knowledge:manage',
    'inpatient:view', 'inpatient:admit', 'inpatient:manage',
    'inpatient:discharge', 'inpatient:bed:manage',
    'emergency:view', 'emergency:triage', 'emergency:green_channel',
    'emergency:resuscitation', 'emergency:observation', 'emergency:disposition',
    'ward_round:write', 'ward_round:countersign',
    'nursing:record', 'nursing:task',
    'inpatient_order:write', 'inpatient_order:review', 'inpatient_order:administer',
  ],
  doctor: [
    'medical_record:read', 'medical_record:write',
    'order:write', 'prescription:write',
    'lab:read', 'imaging:read', 'imaging:view',
    'report:view', 'agent:build', 'agent:publish', 'knowledge:manage',
    'inpatient:view', 'inpatient:admit', 'inpatient:manage',
    'inpatient:discharge', 'inpatient:bed:manage',
    'emergency:view', 'emergency:triage', 'emergency:green_channel',
    'emergency:resuscitation', 'emergency:observation', 'emergency:disposition',
    'ward_round:write', 'ward_round:countersign',
    'inpatient_order:write', 'inpatient_order:review',
  ],
  pharmacist: [
    'prescription:review', 'prescription:write',
    'medical_record:read', 'lab:read', 'report:view',
  ],
  nurse: [
    'medical_record:read', 'lab:read', 'order:write',
    'inpatient:view', 'inpatient:admit', 'inpatient:manage', 'inpatient:bed:manage',
    'emergency:view', 'emergency:triage', 'emergency:green_channel',
    'emergency:resuscitation', 'emergency:observation',
    'nursing:record', 'nursing:task', 'inpatient_order:administer',
  ],
  technician: ['lab:read', 'imaging:read', 'medical_record:write'],
  researcher: ['medical_record:read', 'lab:read', 'report:view'],
  patient: [],
};

/** 科室名 → 科室编码（缺省退化为拼音无关的固定码） */
const DEPT_CODE_MAP: Record<string, string> = {
  心血管内科: 'cardiology',
  呼吸内科: 'respiratory',
  消化内科: 'gastroenterology',
  内分泌科: 'endocrinology',
  神经内科: 'neurology',
  急诊科: 'emergency',
  药学部: 'pharmacy',
  护理部: 'nursing',
  放射科: 'radiology',
  检验科: 'laboratory',
};

/** iam 角色 + 职称 → 前端 RoleCode */
function toRoleCode(role: string, title: string | null): string {
  if (role === 'pharmacist') return 'pharmacist';
  if (role === 'nurse') return 'nurse';
  if (role === 'technician') return 'technician';
  if (role === 'admin') return 'system_admin';
  if (role === 'patient') return 'patient';
  if (role === 'researcher') return 'researcher';
  if (role === 'doctor') {
    if (title?.includes('主任') && !title.includes('副')) return 'chief_physician';
    if (title?.includes('副主任')) return 'associate_chief';
    if (title?.includes('主治')) return 'attending';
    if (title?.includes('住院')) return 'resident';
    return 'attending';
  }
  return 'visitor';
}

type FrontDataScope = 'all' | 'dept' | 'group' | 'self';

function mapDataScope(scope: UserRoleLink['dataScope']): FrontDataScope {
  if (scope === 'self') return 'self';
  if (scope === 'department') return 'dept';
  return 'all';
}

/** 角色字典（用于前端 roles 展示） */
function buildRoleView(roleCode: string, dataScope: FrontDataScope, permissions: string[]) {
  const nameMap: Record<string, string> = {
    doctor: '医生', pharmacist: '药师', nurse: '护士', technician: '技师',
    admin: '管理员', researcher: '科研人员', patient: '患者',
  };
  const frontCode = toRoleCode(roleCode, null);
  return {
    id: `role_${roleCode}`,
    code: frontCode,
    name: nameMap[roleCode] ?? roleCode,
    description: nameMap[roleCode] ?? roleCode,
    level: roleCode === 'admin' ? 'system' : 'dept',
    dataScope,
    status: 'enabled',
    userCount: 0,
    permissionCount: permissions.length,
    permissionCodes: permissions,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  };
}

export interface AuthView {
  id: string;
  username: string;
  realName: string;
  employeeNo: string;
  gender: 'male' | 'female' | 'unknown';
  deptCode: string;
  deptName: string;
  title: string;
  phone: string;
  email: string;
  status: 'active' | 'off' | 'leave' | 'disabled';
  roles: ReturnType<typeof buildRoleView>[];
  roleCodes: string[];
  /** 原始 iam 角色码（doctor/pharmacist/admin…），用于 JWT roles 与后端角色判定 */
  rawRoles: string[];
  permissions: string[];
  dataScope: FrontDataScope;
  lastLoginAt?: string;
  createdAt?: string;
}

/** 构造前端 AuthUser 视图 */
export function buildAuthView(user: User, links: UserRoleLink[]): AuthView {
  const deptName = user.department ?? '未分配科室';
  const deptCode = DEPT_CODE_MAP[deptName] ?? 'dept';

  // 角色：优先 user_roles；缺失时回落到 users.role
  const rawRoles = links.length > 0 ? links.map((l) => l.roleCode) : [user.role];
  const dataScope: FrontDataScope =
    links.length > 0 ? mapDataScope(links[0].dataScope) : user.role === 'admin' ? 'all' : 'dept';

  const roleCodes = rawRoles.map((r) => toRoleCode(r, user.title));
  const permissions = Array.from(
    new Set(rawRoles.flatMap((r) => ROLE_PERMISSIONS[r] ?? [])),
  );

  const roles = rawRoles.map((r) =>
    buildRoleView(r, dataScope, ROLE_PERMISSIONS[r] ?? []),
  );

  return {
    id: user.id,
    username: user.username,
    realName: user.name,
    employeeNo: user.employeeNo ?? `EMP${user.id.slice(0, 8)}`,
    gender: 'unknown',
    deptCode,
    deptName,
    title: user.title ?? '',
    phone: '',
    email: '',
    status: user.status === 'active' ? 'active' : 'disabled',
    roles,
    roleCodes,
    rawRoles,
    permissions,
    dataScope,
    lastLoginAt: user.lastLoginAt ?? undefined,
    createdAt: user.createdAt,
  };
}
