/**
 * 健澜科技 jlmedaios - 用户管理 API 服务（M8-A）
 *
 * 真实 BFF（src/bff/routes/admin/users.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { del, get, post, put } from '../request';
import type {
  AdminUser,
  AdminUserFilter,
  AdminUserList,
  AdminUserStatus,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from '@/types/adminUser';

/** 分页查询用户（关键字、科室、状态） */
export function fetchAdminUsers(filter: AdminUserFilter): Promise<AdminUserList> {
  return get<AdminUserList>('/admin/users', filter);
}

/** 用户详情 */
export function fetchAdminUser(id: string): Promise<AdminUser> {
  return get<AdminUser>(`/admin/users/${id}`);
}

/** 新增账户 */
export function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
  return post<AdminUser>('/admin/users', payload);
}

/** 编辑账户 */
export function updateAdminUser(id: string, payload: UpdateAdminUserPayload): Promise<AdminUser> {
  return put<AdminUser>(`/admin/users/${id}`, payload);
}

/** 变更账户状态（启用/禁用/休假/锁定） */
export function changeAdminUserStatus(
  id: string,
  status: AdminUserStatus,
): Promise<AdminUser> {
  return post<AdminUser>(`/admin/users/${id}/status`, { status });
}

/** 重置密码 */
export function resetAdminUserPassword(
  id: string,
  newPassword: string,
): Promise<{ reset: boolean }> {
  return post<{ reset: boolean }>(`/admin/users/${id}/reset-password`, { newPassword });
}

/** 软删除账户（离职） */
export function deleteAdminUser(id: string): Promise<{ deleted: boolean }> {
  return del<{ deleted: boolean }>(`/admin/users/${id}`);
}
