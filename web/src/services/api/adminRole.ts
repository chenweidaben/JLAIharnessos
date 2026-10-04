/**
 * 健澜科技 jlmedaios - 角色与权限管理 API 服务（M8-B）
 *
 * 真实 BFF（src/bff/routes/admin/roles.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { del, get, post, put } from '../request';
import type {
  AdminPermissionGroup,
  AdminRole,
  AdminRoleDetail,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
} from '@/types/adminRole';

/** 角色列表 */
export function fetchAdminRoles(): Promise<AdminRole[]> {
  return get<AdminRole[]>('/admin/roles');
}

/** 角色详情（含关联用户） */
export function fetchAdminRoleDetail(code: string): Promise<AdminRoleDetail> {
  return get<AdminRoleDetail>(`/admin/roles/${code}`);
}

/** 权限目录（按模块分组，只读） */
export function fetchAdminPermissions(): Promise<AdminPermissionGroup[]> {
  return get<AdminPermissionGroup[]>('/admin/permissions');
}

/** 新建自定义角色 */
export function createAdminRole(payload: CreateAdminRoleInput): Promise<AdminRole> {
  return post<AdminRole>('/admin/roles', payload);
}

/** 编辑角色名称/描述 */
export function updateAdminRole(
  code: string,
  payload: UpdateAdminRoleInput,
): Promise<AdminRole> {
  return put<AdminRole>(`/admin/roles/${code}`, payload);
}

/** 为角色分配权限（整体替换） */
export function assignAdminRolePermissions(
  code: string,
  permissionCodes: string[],
): Promise<AdminRole> {
  return put<AdminRole>(`/admin/roles/${code}/permissions`, { permissionCodes });
}

/** 删除自定义角色 */
export function deleteAdminRole(code: string): Promise<{ deleted: boolean }> {
  return del<{ deleted: boolean }>(`/admin/roles/${code}`);
}
