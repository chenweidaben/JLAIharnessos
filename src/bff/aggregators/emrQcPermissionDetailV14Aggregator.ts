/**
 * 健澜科技 jlmedaios - 质控权限管理明细 V14 聚合器（M507-D，M507 收官，-detail 避让）
 *
 * 纯函数：权限构建 + 分配权限 + 回收权限。
 * 避让说明：M473-B 已有 emrQcPermissionV14，M498-D 已用 -manage 避让，本切片改用 -detail 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 权限条目 */
export interface PermissionDetailV14 {
  role: string;
  resource: string;
  action: string;
}

/**
 * 构建权限。
 *
 * @param role 角色
 * @param resource 资源
 * @param action 操作（read/write/delete）
 * @returns 权限
 */
export function buildPermission(role: string, resource: string, action: string): PermissionDetailV14 {
  return { role, resource, action };
}

/**
 * 分配权限。
 *
 * @param perms 权限数组
 * @param perm 新权限
 * @returns 新权限数组（长度+1）
 */
export function assignPermission(perms: PermissionDetailV14[], perm: PermissionDetailV14): PermissionDetailV14[] {
  // 手算 assign：返回新数组长度+1
  return [...perms, perm];
}

/**
 * 回收权限（按 role + resource 过滤）。
 *
 * @param perms 权限数组
 * @param role 角色
 * @param resource 资源
 * @returns 新权限数组（过滤后长度-1）
 */
export function revokePermission(perms: PermissionDetailV14[], role: string, resource: string): PermissionDetailV14[] {
  // 手算 revoke：按 role+resource 过滤，长度-1
  return perms.filter((p) => !(p.role === role && p.resource === resource));
}
