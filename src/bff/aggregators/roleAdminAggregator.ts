/**
 * 健澜科技 jlmedaios - 角色与权限管理聚合器（M8-B）
 *
 * 系统管理「角色管理」「权限管理」的业务编排：
 *  - 角色列表/详情（权限码、关联用户）；
 *  - 权限目录（按模块分组，只读）；
 *  - 新建/编辑/删除自定义角色，为角色分配权限；
 *  - 角色/权限变更与哈希链审计在同一事务提交。
 *
 * 安全护栏：
 *  - 权限点由迁移/代码定义，不接受运行时凭空新增；
 *  - 系统内置角色不可删除，仅可调整权限；
 *  - 角色仍有用户关联时不可删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type CreateRoleInput,
  type PermissionGroup,
  type RoleDetail,
  type RoleUser,
  type UpdateRoleInput,
  RoleAdminError,
  createRole,
  deleteRole,
  getRole,
  groupPermissions,
  listRoles,
  listRoleUsers,
  replaceRolePermissions,
  updateRole,
} from '../../db/repositories/roleAdminRepo.js';

const notFound = (m: string) => new RoleAdminError(m, 404);

/** 角色列表 */
export async function queryRoles(): Promise<RoleDetail[]> {
  return listRoles();
}

/** 角色详情（含权限码、关联用户） */
export async function getRoleDetail(code: string): Promise<{ role: RoleDetail; users: RoleUser[] }> {
  const role = await getRole(code);
  if (!role) throw notFound('角色不存在');
  const users = await listRoleUsers(code);
  return { role, users };
}

/** 权限目录（按模块分组） */
export async function queryPermissions(): Promise<PermissionGroup[]> {
  return groupPermissions();
}

/** 新建自定义角色 */
export async function createCustomRole(
  auth: AuthView,
  input: CreateRoleInput,
): Promise<RoleDetail> {
  return getDb().begin(async (tx: DbExecutor) => {
    const created = await createRole(input, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'role.create',
        resourceType: 'role',
        resourceId: created.code,
        result: 'success',
        riskLevel: 'medium',
        detail: { name: created.name, permissions: created.permissionCodes.length },
      },
      tx,
    );
    return created;
  });
}

/** 编辑角色名称/描述 */
export async function editCustomRole(
  auth: AuthView,
  code: string,
  input: UpdateRoleInput,
): Promise<RoleDetail> {
  return getDb().begin(async (tx: DbExecutor) => {
    const updated = await updateRole(code, input, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'role.update',
        resourceType: 'role',
        resourceId: code,
        result: 'success',
        riskLevel: 'low',
      },
      tx,
    );
    return updated;
  });
}

/** 为角色分配权限（整体替换） */
export async function assignPermissions(
  auth: AuthView,
  code: string,
  permissionCodes: string[],
): Promise<RoleDetail> {
  const existing = await getRole(code);
  if (!existing) throw notFound('角色不存在');
  return getDb().begin(async (tx: DbExecutor) => {
    await replaceRolePermissions(code, permissionCodes, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'role.assign_permissions',
        resourceType: 'role',
        resourceId: code,
        result: 'success',
        riskLevel: 'high',
        detail: { added: permissionCodes.length },
      },
      tx,
    );
    const updated = await getRole(code, tx);
    if (!updated) throw new RoleAdminError('权限分配后回查失败', 500);
    return updated;
  });
}

/** 删除自定义角色 */
export async function removeCustomRole(
  auth: AuthView,
  code: string,
): Promise<{ deleted: boolean }> {
  return getDb().begin(async (tx: DbExecutor) => {
    await deleteRole(code, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'role.delete',
        resourceType: 'role',
        resourceId: code,
        result: 'success',
        riskLevel: 'high',
      },
      tx,
    );
    return { deleted: true };
  });
}
