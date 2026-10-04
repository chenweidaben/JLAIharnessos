/**
 * 健澜科技 jlmedaios - 角色与权限管理前端类型（M8-B）
 *
 * 与后端 roleAdminRepo 视图对齐。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 角色视图（含权限码、用户数） */
export interface AdminRole {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCodes: string[];
  userCount: number;
  createdAt: string;
}

/** 权限点 */
export interface AdminPermission {
  code: string;
  name: string;
  module: string;
  description: string | null;
}

/** 权限分组（按模块） */
export interface AdminPermissionGroup {
  module: string;
  count: number;
  permissions: AdminPermission[];
}

/** 角色关联用户 */
export interface AdminRoleUser {
  id: string;
  username: string;
  realName: string;
  department: string | null;
  status: string;
}

/** 角色详情（含关联用户） */
export interface AdminRoleDetail {
  role: AdminRole;
  users: AdminRoleUser[];
}

export interface CreateAdminRoleInput {
  code: string;
  name: string;
  description?: string | null;
  permissionCodes?: string[];
}

export interface UpdateAdminRoleInput {
  name?: string;
  description?: string | null;
}
