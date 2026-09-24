/**
 * 健澜科技数智医院智能体 - 用户 Repository
 * iam.users 表查询（认证/权限用）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder } from './helpers.js';

export interface User {
  id: string; username: string; name: string; employeeNo: string | null;
  department: string | null; title: string | null; role: string;
  status: 'active' | 'disabled' | 'locked'; mfaEnabled: boolean;
  lastLoginAt: string | null; createdAt: string;
}

const SELECT_COLS = `id, username, name, employee_no, department, title, role, status, mfa_enabled, last_login_at, created_at`;

function mapRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id), username: String(row.username), name: String(row.name),
    employeeNo: row.employee_no ? String(row.employee_no) : null,
    department: row.department ? String(row.department) : null,
    title: row.title ? String(row.title) : null, role: String(row.role),
    status: row.status as User['status'], mfaEnabled: Boolean(row.mfa_enabled),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at),
  };
}

export async function getUserById(id: string, sql?: Sql): Promise<User | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM iam.users WHERE id = ${id} AND deleted_at IS NULL`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getUserByUsername(username: string, sql?: Sql): Promise<User | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM iam.users WHERE username = ${username} AND deleted_at IS NULL`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function listUsersByDepartment(department: string, limit = 100, sql?: Sql): Promise<User[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('department = ?', department).where("status = ?", 'active').whereRaw('deleted_at IS NULL');
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'iam.users', qb, 'name', limit);
  return rows.map(mapRow);
}

export interface UserRoleLink {
  roleCode: string;
  dataScope: 'self' | 'department' | 'hospital';
  scopeValue: string | null;
}

/** 用户的角色链接与数据范围（iam.user_roles） */
export async function getUserRoleLinks(userId: string, sql?: Sql): Promise<UserRoleLink[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT role_code, data_scope, scope_value
    FROM iam.user_roles WHERE user_id = ${userId}
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    roleCode: String(r.role_code),
    dataScope: String(r.data_scope) as UserRoleLink['dataScope'],
    scopeValue: r.scope_value ? String(r.scope_value) : null,
  }));
}
