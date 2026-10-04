/**
 * 健澜科技 jlmedaios - 用户管理 Repository
 *
 * 真实操作 iam.users / iam.user_roles，为系统管理「用户管理」提供：
 *  - 分页列表（关键字、科室、状态筛选）；
 *  - 新增/编辑账户，多角色与数据范围（user_roles）；
 *  - 启用/禁用/休假、重置密码、软删除。
 *
 * 安全：密码经 PBKDF2-SHA512 哈希后写入 password_hash，不存明文；
 * 所有写操作由聚合器落哈希链审计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { pbkdf2Hash } from '@/security/encryption/HashUtils.js';

export type AdminUserStatus = 'active' | 'disabled' | 'locked' | 'leave';

/** 用户管理视图的账户（含角色与数据范围） */
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
  roleCodes: string[];
  /** 角色对应的数据范围（与 roleCodes 一一对应，来自 user_roles） */
  roleScopes: Record<string, 'self' | 'department' | 'hospital' | 'all'>;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ListUsersFilter {
  keyword?: string;
  deptCode?: string;
  status?: AdminUserStatus;
  limit?: number;
  offset?: number;
}

export interface RoleAssignment {
  roleCode: string;
  dataScope: 'self' | 'department' | 'hospital' | 'all';
  scopeValue?: string | null;
}

export interface CreateUserInput {
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
  roles: RoleAssignment[];
}

export interface UpdateUserInput {
  realName?: string;
  employeeNo?: string | null;
  gender?: 'male' | 'female' | 'unknown';
  deptCode?: string | null;
  title?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: AdminUserStatus;
  roles?: RoleAssignment[];
}

const USER_COLS = `
  id, username, name, employee_no, gender, department, title, position,
  phone, email, status, mfa_enabled, last_login_at, created_at`;

function mapUserRow(row: Record<string, unknown>): Omit<AdminUser, 'roleCodes' | 'roleScopes'> {
  return {
    id: String(row.id),
    username: String(row.username),
    realName: String(row.name),
    employeeNo: row.employee_no ? String(row.employee_no) : null,
    gender: (row.gender as AdminUser['gender']) ?? 'unknown',
    deptCode: row.department ? String(row.department) : null,
    title: row.title ? String(row.title) : null,
    position: row.position ? String(row.position) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    status: row.status as AdminUserStatus,
    mfaEnabled: Boolean(row.mfa_enabled),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at),
  };
}

async function loadRoleLinks(
  db: DbExecutor,
  userIds: string[],
): Promise<Map<string, { roleCodes: string[]; roleScopes: AdminUser['roleScopes'] }>> {
  const result = new Map<string, { roleCodes: string[]; roleScopes: AdminUser['roleScopes'] }>();
  if (userIds.length === 0) return result;
  const rows = await db`
    SELECT user_id, role_code, data_scope
    FROM iam.user_roles
    WHERE user_id IN ${db(userIds)}
    ORDER BY role_code
  `;
  for (const r of rows as Record<string, unknown>[]) {
    const uid = String(r.user_id);
    const entry = result.get(uid) ?? { roleCodes: [], roleScopes: {} };
    entry.roleCodes.push(String(r.role_code));
    entry.roleScopes[String(r.role_code)] = r.data_scope as RoleAssignment['dataScope'];
    result.set(uid, entry);
  }
  return result;
}

function assemble(
  base: Omit<AdminUser, 'roleCodes' | 'roleScopes'>,
  links?: { roleCodes: string[]; roleScopes: AdminUser['roleScopes'] },
): AdminUser {
  return {
    ...base,
    roleCodes: links?.roleCodes ?? [],
    roleScopes: links?.roleScopes ?? {},
  };
}

/** 分页查询用户（未删除） */
export async function listUsers(filter: ListUsersFilter, db: DbExecutor = getDb()): Promise<AdminUser[]> {
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  const rows = await db`
    SELECT ${db.unsafe(USER_COLS)}
    FROM iam.users
    WHERE deleted_at IS NULL
    ${filter.keyword ? db`AND (
      name ILIKE ${'%' + filter.keyword + '%'}
      OR username ILIKE ${'%' + filter.keyword + '%'}
      OR employee_no ILIKE ${'%' + filter.keyword + '%'}
      OR phone ILIKE ${'%' + filter.keyword + '%'}
    )` : db``}
    ${filter.deptCode ? db`AND department = ${filter.deptCode}` : db``}
    ${filter.status ? db`AND status = ${filter.status}` : db``}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const bases = (rows as Record<string, unknown>[]).map(mapUserRow);
  const links = await loadRoleLinks(
    db,
    bases.map((b) => b.id),
  );
  return bases.map((b) => assemble(b, links.get(b.id)));
}

/** 统计符合筛选条件的用户数（分页总数） */
export async function countUsers(filter: ListUsersFilter, db: DbExecutor = getDb()): Promise<number> {
  const rows = await db`
    SELECT count(*)::int AS n
    FROM iam.users
    WHERE deleted_at IS NULL
    ${filter.keyword ? db`AND (
      name ILIKE ${'%' + filter.keyword + '%'}
      OR username ILIKE ${'%' + filter.keyword + '%'}
      OR employee_no ILIKE ${'%' + filter.keyword + '%'}
      OR phone ILIKE ${'%' + filter.keyword + '%'}
    )` : db``}
    ${filter.deptCode ? db`AND department = ${filter.deptCode}` : db``}
    ${filter.status ? db`AND status = ${filter.status}` : db``}
  `;
  return Number((rows as Record<string, unknown>[])[0]?.n ?? 0);
}

/** 按 ID 查用户详情（含角色）；不存在或已删除返回 null */
export async function getAdminUser(id: string, db: DbExecutor = getDb()): Promise<AdminUser | null> {
  const rows = await db`
    SELECT ${db.unsafe(USER_COLS)}
    FROM iam.users
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  if (rows.length === 0) return null;
  const base = mapUserRow(rows[0] as Record<string, unknown>);
  const links = await loadRoleLinks(db, [base.id]);
  return assemble(base, links.get(base.id));
}

/** 替换某用户的角色链接（在调用方事务内执行） */
async function replaceRoles(db: DbExecutor, userId: string, roles: RoleAssignment[], grantedBy: string): Promise<void> {
  await db`DELETE FROM iam.user_roles WHERE user_id = ${userId}`;
  for (const r of roles) {
    await db`
      INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value, granted_by)
      VALUES (${userId}, ${r.roleCode}, ${r.dataScope}, ${r.scopeValue ?? null}, ${grantedBy})
    `;
  }
}

/** 新建账户（含角色），返回新用户；用户名/工号冲突由调用方映射为 409 */
export async function createUser(
  input: CreateUserInput,
  operatorId: string,
  db: DbExecutor = getDb(),
): Promise<AdminUser> {
  if (input.roles.length === 0) throw new UserAdminError('至少分配一个角色', 400);
  const passwordHash = pbkdf2Hash(input.password);
  const rows = await db`
    INSERT INTO iam.users (
      username, password_hash, name, employee_no, gender, department, title,
      position, phone, email, status
    ) VALUES (
      ${input.username}, ${passwordHash}, ${input.realName}, ${input.employeeNo ?? null},
      ${input.gender ?? 'unknown'}, ${input.deptCode ?? null}, ${input.title ?? null},
      ${input.position ?? null}, ${input.phone ?? null}, ${input.email ?? null},
      ${input.status ?? 'active'}
    )
    RETURNING id
  `;
  const newId = String((rows as Record<string, unknown>[])[0]?.id);
  await replaceRoles(db, newId, input.roles, operatorId);
  const created = await getAdminUser(newId, db);
  if (!created) throw new UserAdminError('账户创建后回查失败', 500);
  return created;
}

/** 编辑账户资料；roles 提供时替换角色链接 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  operatorId: string,
  db: DbExecutor = getDb(),
): Promise<AdminUser> {
  const existing = await getAdminUser(id, db);
  if (!existing) throw new UserAdminError('用户不存在或已删除', 404);
  if (input.roles && input.roles.length === 0) throw new UserAdminError('至少保留一个角色', 400);
  await db`
    UPDATE iam.users SET
      name = COALESCE(${input.realName ?? null}, name),
      employee_no = COALESCE(${input.employeeNo ?? null}, employee_no),
      gender = COALESCE(${input.gender ?? null}, gender),
      department = COALESCE(${input.deptCode ?? null}, department),
      title = COALESCE(${input.title ?? null}, title),
      position = COALESCE(${input.position ?? null}, position),
      phone = COALESCE(${input.phone ?? null}, phone),
      email = COALESCE(${input.email ?? null}, email),
      status = COALESCE(${input.status ?? null}, status)
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  if (input.roles) await replaceRoles(db, id, input.roles, operatorId);
  const updated = await getAdminUser(id, db);
  if (!updated) throw new UserAdminError('账户更新后回查失败', 500);
  return updated;
}

/** 设置账户状态（启用/禁用/休假/锁定） */
export async function setUserStatus(
  id: string,
  status: AdminUserStatus,
  db: DbExecutor = getDb(),
): Promise<AdminUser> {
  const rows = await db`
    UPDATE iam.users SET status = ${status}
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  if (rows.length === 0) throw new UserAdminError('用户不存在或已删除', 404);
  const updated = await getAdminUser(id, db);
  if (!updated) throw new UserAdminError('状态更新后回查失败', 500);
  return updated;
}

/** 重置密码（PBKDF2 哈希），返回是否成功 */
export async function resetPassword(
  id: string,
  newPassword: string,
  db: DbExecutor = getDb(),
): Promise<boolean> {
  const passwordHash = pbkdf2Hash(newPassword);
  const rows = await db`
    UPDATE iam.users SET password_hash = ${passwordHash}
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

/** 软删除账户（离职），同时吊销其会话 */
export async function softDeleteUser(id: string, db: DbExecutor = getDb()): Promise<void> {
  const rows = await db`
    UPDATE iam.users SET deleted_at = now(), status = 'disabled'
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  if (rows.length === 0) throw new UserAdminError('用户不存在或已删除', 404);
}

/** 用户管理业务错误（携带 HTTP 状态码） */
export class UserAdminError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'UserAdminError';
    this.status = status;
  }
}
