/**
 * 健澜科技 jlmedaios - 质控权限管理 V14 聚合器（M498-D，避让 M473-B emrQcPermissionV14）
 *
 * 纯函数：角色权限构建 + 角色权限检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 角色权限 */
export interface PermissionManageV14 {
  role: string;
  permissions: string[];
}

/**
 * 构建角色权限。
 *
 * @param role 角色
 * @param permissions 权限列表
 * @returns 角色权限
 */
export function buildPermission(role: string, permissions: string[]): PermissionManageV14 {
  return { role, permissions };
}

/**
 * 检查角色是否有指定操作权限。
 *
 * @param rolePermissions 角色权限数组
 * @param role 角色名
 * @param action 操作名
 * @returns 是否有权限
 */
export function checkPermission(rolePermissions: PermissionManageV14[], role: string, action: string): boolean {
  // 手算权限检查：在指定角色的 permissions 数组中查找 action 是否存在
  const found = rolePermissions.find((p) => p.role === role);
  if (!found) {
    return false;
  }
  return found.permissions.includes(action);
}
