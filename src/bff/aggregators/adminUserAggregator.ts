/**
 * 健澜科技 jlmedaios - 用户管理聚合器（M8-A）
 *
 * 系统管理「用户管理」的业务编排：
 *  - 分页列表（关键字、科室、状态）；
 *  - 新增/编辑（多角色 + 数据范围）；
 *  - 启用/禁用/休假、重置密码、软删除；
 *  - 账户变更与哈希链审计在同一事务提交；
 *  - 禁用/删除时同步吊销该用户活跃会话（强制下线）。
 *
 * 安全护栏：
 *  - 不能禁用/删除自己（避免管理员锁死自身）；
 *  - 不能删除/降级最后一个管理员（避免系统失去管理入口）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { revokeForUser } from '../../db/repositories/sessionRepo.js';
import {
  type AdminUser,
  type AdminUserStatus,
  type CreateUserInput,
  type ListUsersFilter,
  type UpdateUserInput,
  UserAdminError,
  countUsers,
  createUser,
  getAdminUser,
  listUsers,
  resetPassword,
  softDeleteUser,
  updateUser,
} from '../../db/repositories/adminUserRepo.js';

const badRequest = (m: string) => new UserAdminError(m, 400);
const notFound = (m: string) => new UserAdminError(m, 404);
const conflict = (m: string) => new UserAdminError(m, 409);

/** 唯一约束冲突（用户名/工号）映射为 409 */
function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string })?.code === '23505';
}

/** 分页查询用户 + 总数 */
export async function queryUsers(
  filter: ListUsersFilter,
): Promise<{ items: AdminUser[]; total: number }> {
  const [items, total] = await Promise.all([listUsers(filter), countUsers(filter)]);
  return { items, total };
}

/** 用户详情 */
export async function getUserDetail(id: string): Promise<AdminUser> {
  const user = await getAdminUser(id);
  if (!user) throw notFound('用户不存在或已删除');
  return user;
}

/** 新增账户 */
export async function createAccount(auth: AuthView, input: CreateUserInput): Promise<AdminUser> {
  try {
    return await getDb().begin(async (tx: DbExecutor) => {
      const created = await createUser(input, auth.id, tx);
      await recordChainAudit(
        {
          actorId: auth.id,
          actorName: auth.realName ?? auth.username,
          actorRole: auth.rawRoles.join(','),
          action: 'user.create',
          resourceType: 'user',
          resourceId: created.id,
          result: 'success',
          riskLevel: 'medium',
          detail: { username: created.username, roles: created.roleCodes },
        },
        tx,
      );
      return created;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('用户名或工号已存在');
    throw e;
  }
}

/** 编辑账户（roles 提供时替换角色） */
export async function editAccount(
  auth: AuthView,
  id: string,
  input: UpdateUserInput,
): Promise<AdminUser> {
  const target = await getUserDetail(id);
  // 不允许把自己的状态改成禁用/休假/锁定
  if (id === auth.id && input.status && input.status !== 'active') {
    throw badRequest('不能修改自己的账户状态（避免锁死自身）');
  }
  try {
    return await getDb().begin(async (tx: DbExecutor) => {
      const updated = await updateUser(id, input, auth.id, tx);
      await recordChainAudit(
        {
          actorId: auth.id,
          actorName: auth.realName ?? auth.username,
          actorRole: auth.rawRoles.join(','),
          action: 'user.update',
          resourceType: 'user',
          resourceId: id,
          result: 'success',
          riskLevel: 'medium',
          detail: { fields: Object.keys(input) },
        },
        tx,
      );
      return updated;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict('工号已被其他账户占用');
    throw e;
  }
}

/** 统计某角色（admin）的活跃账户数，用于"最后一个管理员"保护 */
async function countActiveAdmins(db: DbExecutor): Promise<number> {
  const rows = await db`
    SELECT count(*)::int AS n
    FROM iam.users u
    JOIN iam.user_roles ur ON ur.user_id = u.id AND ur.role_code = 'admin'
    WHERE u.deleted_at IS NULL AND u.status = 'active'
  `;
  return Number((rows as Record<string, unknown>[])[0]?.n ?? 0);
}

/** 变更账户状态（启用/禁用/休假/锁定）；禁用时吊销会话 */
export async function changeStatus(
  auth: AuthView,
  id: string,
  status: AdminUserStatus,
): Promise<AdminUser> {
  const target = await getUserDetail(id);
  if (id === auth.id && status !== 'active') {
    throw badRequest('不能修改自己的账户状态（避免锁死自身）');
  }
  return getDb().begin(async (tx: DbExecutor) => {
    // 禁用最后一个管理员保护
    if (status !== 'active' && target.roleCodes.includes('admin')) {
      const adminCount = await countActiveAdmins(tx);
      if (adminCount <= 1) {
        throw conflict('至少保留一个启用的管理员账户');
      }
    }
    const updated = await updateUser(id, { status }, auth.id, tx);
    if (status !== 'active') {
      await revokeForUser(id, 'admin_force', null, tx);
    }
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'user.status_change',
        resourceType: 'user',
        resourceId: id,
        result: 'success',
        riskLevel: status === 'active' ? 'low' : 'high',
        detail: { status },
      },
      tx,
    );
    return updated;
  });
}

/** 重置密码 */
export async function adminResetPassword(
  auth: AuthView,
  id: string,
  newPassword: string,
): Promise<{ reset: boolean }> {
  await getUserDetail(id);
  if (newPassword.length < 8) throw badRequest('密码长度至少 8 位');
  return getDb().begin(async (tx: DbExecutor) => {
    const okReset = await resetPassword(id, newPassword, tx);
    // 重置密码后强制下线，要求用新密码重新登录
    if (okReset) await revokeForUser(id, 'admin_force', null, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'user.reset_password',
        resourceType: 'user',
        resourceId: id,
        result: 'success',
        riskLevel: 'high',
      },
      tx,
    );
    return { reset: okReset };
  });
}

/** 软删除账户（离职）；吊销会话，最后一个管理员保护 */
export async function removeAccount(auth: AuthView, id: string): Promise<{ deleted: boolean }> {
  if (id === auth.id) throw badRequest('不能删除自己的账户');
  const target = await getUserDetail(id);
  return getDb().begin(async (tx: DbExecutor) => {
    if (target.roleCodes.includes('admin')) {
      const adminCount = await countActiveAdmins(tx);
      if (adminCount <= 1) throw conflict('至少保留一个管理员账户');
    }
    await softDeleteUser(id, tx);
    await revokeForUser(id, 'admin_force', null, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles.join(','),
        action: 'user.delete',
        resourceType: 'user',
        resourceId: id,
        result: 'success',
        riskLevel: 'high',
      },
      tx,
    );
    return { deleted: true };
  });
}
