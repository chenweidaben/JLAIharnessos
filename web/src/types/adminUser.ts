/**
 * 健澜科技 jlmedaios - 用户管理前端类型（M8-A）
 *
 * 与后端 adminUserRepo / BFF 路由对齐，真实操作 iam 表。
 * 角色 code 以 iam.roles 实际种子为准（admin/doctor/nurse/pharmacist/
 * technician/researcher/patient）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** iam.roles 实际角色 code */
export type AdminRoleCode =
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'technician'
  | 'researcher'
  | 'patient';

/** iam.user_roles 数据范围 */
export type AdminDataScope = 'self' | 'department' | 'hospital' | 'all';

/** iam.users 账户状态 */
export type AdminUserStatus = 'active' | 'disabled' | 'locked' | 'leave';

/** 角色分配（一个角色 + 对应数据范围） */
export interface AdminRoleAssignment {
  roleCode: AdminRoleCode;
  dataScope: AdminDataScope;
  scopeValue?: string | null;
}

/** 用户管理视图的账户 */
export interface AdminUser {
  id: string;
  username: string;
  realName: string;
  employeeNo: string | null;
  gender: 'male' | 'female' | 'unknown';
  deptCode: string | null;
  title: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  status: AdminUserStatus;
  mfaEnabled: boolean;
  roleCodes: AdminRoleCode[];
  roleScopes: Record<string, AdminDataScope>;
  lastLoginAt: string | null;
  createdAt: string;
}

/** 列表查询结果（分页） */
export interface AdminUserList {
  items: AdminUser[];
  total: number;
}

/** 列表筛选 */
export interface AdminUserFilter {
  keyword?: string;
  deptCode?: string;
  status?: AdminUserStatus;
  limit?: number;
  offset?: number;
}

/** 新建账户入参 */
export interface CreateAdminUserPayload {
  username: string;
  password: string;
  realName: string;
  employeeNo?: string | null;
  gender?: 'male' | 'female' | 'unknown';
  deptCode?: string | null;
  title?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: AdminUserStatus;
  roles: AdminRoleAssignment[];
}

/** 编辑账户入参 */
export interface UpdateAdminUserPayload {
  realName?: string;
  employeeNo?: string | null;
  gender?: 'male' | 'female' | 'unknown';
  deptCode?: string | null;
  title?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: AdminUserStatus;
  roles?: AdminRoleAssignment[];
}
