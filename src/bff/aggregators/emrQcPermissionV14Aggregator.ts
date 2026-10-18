/**
 * 健澜科技 jlmedaios - 病历质控权限管理 V14 聚合器（M473-B）
 *
 * 纯函数：生成角色×权限矩阵 + 查询权限。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 权限矩阵行 */
export interface PermissionRowV14 {
  role: string;
  permissions: Record<string, boolean>;
}

/**
 * 生成角色×权限矩阵，默认全 false。
 *
 * @param roles 角色列表
 * @param permissions 权限列表
 * @returns 权限矩阵
 */
export function buildPermissionMatrix(
  roles: string[],
  permissions: string[],
): PermissionRowV14[] {
  return roles.map((role) => {
    const rowPermissions: Record<string, boolean> = {};
    permissions.forEach((p) => {
      rowPermissions[p] = false;
    });
    return { role, permissions: rowPermissions };
  });
}

/**
 * 查询某角色是否有某权限。
 *
 * @param role 角色名
 * @param permission 权限名
 * @param matrix 权限矩阵
 * @returns 是否有权限（不存在的角色返回 false）
 */
export function checkPermission(
  role: string,
  permission: string,
  matrix: PermissionRowV14[],
): boolean {
  const row = matrix.find((r) => r.role === role);
  if (!row) return false;
  return row.permissions[permission] === true;
}
