/**
 * 健澜科技 jlmedaios - 登录尝试 Repository（M8-C）
 *
 * 写入：登录成功/失败均追加一条 iam.login_attempts（只增不改不删）。
 * 查询：为系统管理「登录日志」页提供分页列表（join iam.users 取姓名/部门、
 * 子查询判断当前是否在线）、概览统计与每日趋势。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/** 登录日志视图 */
export interface LoginAttemptView {
  id: number;
  username: string;
  userId: string | null;
  realName: string | null;
  department: string | null;
  success: boolean;
  failReason: string | null;
  ip: string | null;
  userAgent: string | null;
  online: boolean;
  createdAt: string;
}

/** 登录日志筛选 */
export interface LoginLogFilter {
  keyword?: string;
  success?: boolean;
  startTime?: string;
  endTime?: string;
  page: number;
  pageSize: number;
}

export interface PagedLoginLogs {
  items: LoginAttemptView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecordLoginAttemptInput {
  username: string;
  userId?: string | null;
  success: boolean;
  failReason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

const SELECT_COLS = `a.id, a.username, a.user_id, a.success, a.fail_reason,
  a.ip, a.user_agent, a.created_at,
  u.name AS real_name, u.department,
  EXISTS (
    SELECT 1 FROM clinical.user_sessions s
    WHERE s.user_id = a.user_id::text
      AND s.revoked_at IS NULL AND s.access_expires_at > now()
  ) AS online`;

function mapRow(row: Record<string, unknown>): LoginAttemptView {
  return {
    id: Number(row.id),
    username: String(row.username),
    userId: row.user_id != null ? String(row.user_id) : null,
    realName: row.real_name != null ? String(row.real_name) : null,
    department: row.department != null ? String(row.department) : null,
    success: Boolean(row.success),
    failReason: row.fail_reason != null ? String(row.fail_reason) : null,
    ip: row.ip != null ? String(row.ip) : null,
    userAgent: row.user_agent != null ? String(row.user_agent) : null,
    online: Boolean(row.online),
    createdAt: String(row.created_at),
  };
}

/** 追加一条登录尝试（登录成功/失败均调用） */
export async function recordLoginAttempt(
  input: RecordLoginAttemptInput,
  sql?: DbExecutor,
): Promise<void> {
  const db = sql ?? getDb();
  await db`
    INSERT INTO iam.login_attempts
      (username, user_id, success, fail_reason, ip, user_agent)
    VALUES
      (${input.username}, ${input.userId ?? null}, ${input.success},
       ${input.failReason ?? null}, ${input.ip ?? null}, ${input.userAgent ?? null})
  `;
}

/** 构造筛选 WHERE */
function buildWhere(db: DbExecutor, f: LoginLogFilter) {
  const kw = f.keyword?.trim();
  return db`
    ${kw ? db`AND (a.username ILIKE ${'%' + kw + '%'} OR u.name ILIKE ${'%' + kw + '%'})` : db``}
    ${f.success !== undefined ? db`AND a.success = ${f.success}` : db``}
    ${f.startTime ? db`AND a.created_at >= ${f.startTime}` : db``}
    ${f.endTime ? db`AND a.created_at <= ${f.endTime}` : db``}
  `;
}

/** 分页查询登录日志 */
export async function listLoginLogs(
  filter: LoginLogFilter,
  sql?: DbExecutor,
): Promise<PagedLoginLogs> {
  const db = sql ?? getDb();
  const page = Math.max(1, filter.page);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize));
  const where = buildWhere(db, filter);
  const totalRows = await db`
    SELECT count(*)::int AS n
    FROM iam.login_attempts a
    LEFT JOIN iam.users u ON u.id = a.user_id
    WHERE 1=1 ${where}
  `;
  const total = Number((totalRows[0] as Record<string, unknown>).n);
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)}
    FROM iam.login_attempts a
    LEFT JOIN iam.users u ON u.id = a.user_id
    WHERE 1=1 ${where}
    ORDER BY a.id DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;
  return {
    items: (rows as Record<string, unknown>[]).map(mapRow),
    total,
    page,
    pageSize,
  };
}

/** 登录日志概览：今日登录 / 当前在线 / 失败率 / 今日失败 */
export async function loginLogOverview(sql?: DbExecutor): Promise<{
  today: number;
  online: number;
  todayFail: number;
  failRate: number;
}> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT
      count(*) FILTER (WHERE a.created_at >= date_trunc('day', now()))::int AS today,
      count(*) FILTER (WHERE a.success = false AND a.created_at >= date_trunc('day', now()))::int AS today_fail,
      count(*) FILTER (WHERE a.success = false)::int AS total_fail,
      count(*)::int AS total
    FROM iam.login_attempts a
  `;
  const r = rows[0] as Record<string, unknown>;
  const onlineRows = await db`
    SELECT count(DISTINCT user_id)::int AS n
    FROM clinical.user_sessions
    WHERE revoked_at IS NULL AND access_expires_at > now()
  `;
  const total = Number(r.total);
  return {
    today: Number(r.today),
    todayFail: Number(r.today_fail),
    online: Number((onlineRows[0] as Record<string, unknown>).n),
    failRate: total > 0 ? Math.round((Number(r.total_fail) / total) * 1000) / 10 : 0,
  };
}

/** 近 N 天每日登录（成功/失败拆分，供趋势图） */
export async function loginDailyTrend(
  days = 7,
  sql?: DbExecutor,
): Promise<{ date: string; success: number; failure: number }[]> {
  const db = sql ?? getDb();
  const n = Math.min(90, Math.max(1, days));
  const rows = await db`
    SELECT d::date AS date,
      count(a.id) FILTER (WHERE a.success)::int AS success,
      count(a.id) FILTER (WHERE NOT a.success)::int AS failure
    FROM generate_series(date_trunc('day', now()) - ${n - 1} * interval '1 day',
                         date_trunc('day', now()), interval '1 day') d
    LEFT JOIN iam.login_attempts a ON a.created_at >= d AND a.created_at < d + interval '1 day'
    GROUP BY d ORDER BY d
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    date: String(r.date),
    success: Number(r.success),
    failure: Number(r.failure),
  }));
}
