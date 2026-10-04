/**
 * 健澜科技 jlmedaios - 角色与权限管理 Repository（M8-B）
 *
 * 真实操作 iam.roles / iam.permissions / iam.role_permissions /
 * iam.user_roles，为系统管理「角色管理」「权限管理」提供：
 *  - 角色列表（含权限码、关联用户数、是否系统内置）；
 *  - 角色详情（权限码 + 关联用户）；
 *  - 新建/编辑/删除自定义角色，为角色分配权限；
 *  - 权限目录（按模块分组，管理端只读）。
 *
 * 安全：权限点由迁移/代码统一定义，不在运行时凭空新增；
 * 系统内置角色（is_system）不可删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/** 角色视图（含权限码、用户数） */
export interface RoleDetail {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCodes: string[];
  userCount: number;
  createdAt: string;
}

/** 权限点 */
export interface PermissionItem {
  code: string;
  name: string;
  module: string;
  description: string | null;
}

/** 权限分组（按模块） */
export interface PermissionGroup {
  module: string;
  count: number;
  permissions: PermissionItem[];
}

/** 角色关联用户 */
export interface RoleUser {
  id: string;
  username: string;
  realName: string;
  department: string | null;
  status: string;
}

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string | null;
  permissionCodes?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
}

/** 角色管理业务错误（携带 HTTP 状态码） */
export class RoleAdminError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RoleAdminError';
    this.status = status;
  }
}

function mapRoleRow(row: Record<string, unknown>): Omit<RoleDetail, 'permissionCodes' | 'userCount'> {
  return {
    code: String(row.code),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    isSystem: Boolean(row.is_system),
    createdAt: String(row.created_at),
  };
}

/** 批量加载角色权限码 */
async function loadRolePermissions(
  db: DbExecutor,
  codes: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (codes.length === 0) return result;
  const rows = await db`
    SELECT role_code, permission_code
    FROM iam.role_permissions
    WHERE role_code IN ${db(codes)}
    ORDER BY permission_code
  `;
  for (const r of rows as Record<string, unknown>[]) {
    const rc = String(r.role_code);
    const list = result.get(rc) ?? [];
    list.push(String(r.permission_code));
    result.set(rc, list);
  }
  return result;
}

/** 批量统计角色关联用户数（仅未删除用户） */
async function loadRoleUserCounts(
  db: DbExecutor,
  codes: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (codes.length === 0) return result;
  const rows = await db`
    SELECT ur.role_code, count(*)::int AS n
    FROM iam.user_roles ur
    JOIN iam.users u ON u.id = ur.user_id AND u.deleted_at IS NULL
    WHERE ur.role_code IN ${db(codes)}
    GROUP BY ur.role_code
  `;
  for (const r of rows as Record<string, unknown>[]) {
    result.set(String(r.role_code), Number(r.n));
  }
  return result;
}

/** 角色列表（含权限码、用户数） */
export async function listRoles(db: DbExecutor = getDb()): Promise<RoleDetail[]> {
  const rows = await db`
    SELECT code, name, description, is_system, created_at
    FROM iam.roles
    ORDER BY (is_system = false), code
  `;
  const bases = (rows as Record<string, unknown>[]).map(mapRoleRow);
  const codes = bases.map((b) => b.code);
  const [perms, counts] = await Promise.all([
    loadRolePermissions(db, codes),
    loadRoleUserCounts(db, codes),
  ]);
  return bases.map((b) => ({
    ...b,
    permissionCodes: perms.get(b.code) ?? [],
    userCount: counts.get(b.code) ?? 0,
  }));
}

/** 角色详情；不存在返回 null */
export async function getRole(code: string, db: DbExecutor = getDb()): Promise<RoleDetail | null> {
  const rows = await db`
    SELECT code, name, description, is_system, created_at
    FROM iam.roles WHERE code = ${code}
  `;
  if (rows.length === 0) return null;
  const base = mapRoleRow(rows[0] as Record<string, unknown>);
  const [perms, counts] = await Promise.all([
    loadRolePermissions(db, [base.code]),
    loadRoleUserCounts(db, [base.code]),
  ]);
  return {
    ...base,
    permissionCodes: perms.get(base.code) ?? [],
    userCount: counts.get(base.code) ?? 0,
  };
}

/** 角色下用户列表（未删除） */
export async function listRoleUsers(code: string, db: DbExecutor = getDb()): Promise<RoleUser[]> {
  const rows = await db`
    SELECT u.id, u.username, u.name, u.department, u.status
    FROM iam.user_roles ur
    JOIN iam.users u ON u.id = ur.user_id
    WHERE ur.role_code = ${code} AND u.deleted_at IS NULL
    ORDER BY u.name
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    username: String(r.username),
    realName: String(r.name),
    department: r.department ? String(r.department) : null,
    status: String(r.status),
  }));
}

/** 权限目录（全部权限点） */
export async function listPermissions(db: DbExecutor = getDb()): Promise<PermissionItem[]> {
  const rows = await db`
    SELECT code, name, module, description
    FROM iam.permissions
    ORDER BY module, code
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    code: String(r.code),
    name: String(r.name),
    module: String(r.module),
    description: r.description ? String(r.description) : null,
  }));
}

/** 权限目录按模块分组 */
export async function groupPermissions(db: DbExecutor = getDb()): Promise<PermissionGroup[]> {
  const items = await listPermissions(db);
  const map = new Map<string, PermissionItem[]>();
  for (const item of items) {
    const list = map.get(item.module) ?? [];
    list.push(item);
    map.set(item.module, list);
  }
  return [...map.entries()].map(([module, permissions]) => ({
    module,
    count: permissions.length,
    permissions,
  }));
}

/** 校验权限码均存在（不存在则抛 400） */
async function assertPermissionsExist(
  db: DbExecutor,
  codes: string[],
): Promise<void> {
  if (codes.length === 0) return;
  const rows = await db`
    SELECT code FROM iam.permissions WHERE code IN ${db(codes)}
  `;
  const found = new Set((rows as Record<string, unknown>[]).map((r) => String(r.code)));
  const missing = codes.filter((c) => !found.has(c));
  if (missing.length > 0) {
    throw new RoleAdminError(`以下权限码不存在: ${missing.join(', ')}`, 400);
  }
}

/** 替换某角色的权限（在调用方事务内） */
export async function replaceRolePermissions(
  code: string,
  permissionCodes: string[],
  db: DbExecutor = getDb(),
): Promise<void> {
  await assertPermissionsExist(db, permissionCodes);
  await db`DELETE FROM iam.role_permissions WHERE role_code = ${code}`;
  for (const p of permissionCodes) {
    await db`
      INSERT INTO iam.role_permissions (role_code, permission_code)
      VALUES (${code}, ${p})
    `;
  }
}

/** 新建自定义角色（is_system=false），可选初始权限 */
export async function createRole(
  input: CreateRoleInput,
  db: DbExecutor = getDb(),
): Promise<RoleDetail> {
  const permissionCodes = input.permissionCodes ?? [];
  await assertPermissionsExist(db, permissionCodes);
  try {
    await db`
      INSERT INTO iam.roles (code, name, description, is_system)
      VALUES (${input.code}, ${input.name}, ${input.description ?? null}, false)
    `;
  } catch (e) {
    if ((e as { code?: string })?.code === '23505') {
      throw new RoleAdminError('角色编码已存在', 409);
    }
    throw e;
  }
  for (const p of permissionCodes) {
    await db`
      INSERT INTO iam.role_permissions (role_code, permission_code)
      VALUES (${input.code}, ${p})
    `;
  }
  const created = await getRole(input.code, db);
  if (!created) throw new RoleAdminError('角色创建后回查失败', 500);
  return created;
}

/** 编辑角色名称/描述；系统角色仅可改名称描述 */
export async function updateRole(
  code: string,
  input: UpdateRoleInput,
  db: DbExecutor = getDb(),
): Promise<RoleDetail> {
  const rows = await db`
    UPDATE iam.roles SET
      name = COALESCE(${input.name ?? null}, name),
      description = COALESCE(${input.description ?? null}, description)
    WHERE code = ${code}
    RETURNING code
  `;
  if (rows.length === 0) throw new RoleAdminError('角色不存在', 404);
  const updated = await getRole(code, db);
  if (!updated) throw new RoleAdminError('角色更新后回查失败', 500);
  return updated;
}

/** 删除角色：系统内置角色拒绝；仍有用户关联时拒绝 */
export async function deleteRole(code: string, db: DbExecutor = getDb()): Promise<void> {
  const role = await getRole(code, db);
  if (!role) throw new RoleAdminError('角色不存在', 404);
  if (role.isSystem) {
    throw new RoleAdminError('系统内置角色不可删除，仅可调整权限', 400);
  }
  if (role.userCount > 0) {
    throw new RoleAdminError(
      `该角色仍有 ${role.userCount} 个关联用户，请先解除用户关联后再删除`,
      409,
    );
  }
  await db`DELETE FROM iam.role_permissions WHERE role_code = ${code}`;
  await db`DELETE FROM iam.roles WHERE code = ${code}`;
}
