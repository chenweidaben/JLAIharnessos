/**
 * 健澜科技数智医院智能体 - 会话管理 Repository
 * clinical.user_sessions 表读写（M7-F）。
 *
 *  - createSession：登录成功后登记会话（jti 与访问令牌一一对应）；
 *  - getActiveByJti：认证中间件按 jti 判断会话是否仍有效
 *    （未吊销且访问令牌未过期）；
 *  - revokeByJti：主动登出，吊销单个会话；
 *  - revokeByRefreshJti：刷新轮换时吊销旧会话；
 *  - revokeForUser：管理员强制下线，吊销某用户全部活跃会话；
 *  - listActiveSessions：在线会话审计；
 *  - deleteExpiredSessions：回收过期会话。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export interface UserSession {
  id: number;
  jti: string;
  refreshJti: string | null;
  userId: string;
  issuedAt: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  ip: string | null;
  userAgent: string | null;
}

const SELECT_COLS = `id, jti, refresh_jti, user_id, issued_at, access_expires_at,
  refresh_expires_at, revoked_at, revoke_reason, ip, user_agent`;

function mapRow(row: Record<string, unknown>): UserSession {
  return {
    id: Number(row.id),
    jti: String(row.jti),
    refreshJti: row.refresh_jti != null ? String(row.refresh_jti) : null,
    userId: String(row.user_id),
    issuedAt: String(row.issued_at),
    accessExpiresAt: String(row.access_expires_at),
    refreshExpiresAt: String(row.refresh_expires_at),
    revokedAt: row.revoked_at != null ? String(row.revoked_at) : null,
    revokeReason: row.revoke_reason != null ? String(row.revoke_reason) : null,
    ip: row.ip != null ? String(row.ip) : null,
    userAgent: row.user_agent != null ? String(row.user_agent) : null,
  };
}

export interface CreateSessionInput {
  jti: string;
  refreshJti: string;
  userId: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}

/** 登录成功后登记会话。 */
export async function createSession(
  input: CreateSessionInput,
  sql?: DbExecutor,
): Promise<UserSession> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.user_sessions
      (jti, refresh_jti, user_id, access_expires_at, refresh_expires_at, ip, user_agent)
    VALUES
      (${input.jti}, ${input.refreshJti}, ${input.userId},
       ${input.accessExpiresAt.toISOString()}, ${input.refreshExpiresAt.toISOString()},
       ${input.ip}, ${input.userAgent})
    RETURNING ${db.unsafe(SELECT_COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

/**
 * 按访问令牌 jti 取活跃会话；未吊销且未过期才返回，否则返回 null。
 * 认证中间件据此实现 JWT 主动吊销。
 */
export async function getActiveByJti(
  jti: string,
  sql?: DbExecutor,
): Promise<UserSession | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)}
    FROM clinical.user_sessions
    WHERE jti = ${jti}
      AND revoked_at IS NULL
      AND access_expires_at > now()`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * 按 refresh_jti 判断会话是否仍有效（未吊销且刷新令牌未过期）。
 * refresh 端点据此识别已被吊销/轮换的刷新令牌。
 */
export async function getActiveByRefreshJti(
  refreshJti: string,
  sql?: DbExecutor,
): Promise<UserSession | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)}
    FROM clinical.user_sessions
    WHERE refresh_jti = ${refreshJti}
      AND revoked_at IS NULL
      AND refresh_expires_at > now()`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 按 jti 吊销会话（主动登出），返回是否命中。 */
export async function revokeByJti(
  jti: string,
  reason: string,
  sql?: DbExecutor,
): Promise<boolean> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.user_sessions
      SET revoked_at = now(), revoke_reason = ${reason}
    WHERE jti = ${jti} AND revoked_at IS NULL`;
  return (rows as unknown as { count: number }).count > 0;
}

/** 按 refresh_jti 吊销会话（刷新轮换），返回是否命中。 */
export async function revokeByRefreshJti(
  refreshJti: string,
  reason: string,
  sql?: DbExecutor,
): Promise<boolean> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.user_sessions
      SET revoked_at = now(), revoke_reason = ${reason}
    WHERE refresh_jti = ${refreshJti} AND revoked_at IS NULL`;
  return (rows as unknown as { count: number }).count > 0;
}

/** 吊销某用户全部活跃会话（管理员强制下线），可排除当前会话。 */
export async function revokeForUser(
  userId: string,
  reason: string,
  exceptJti: string | null = null,
  sql?: DbExecutor,
): Promise<number> {
  const db = sql ?? getDb();
  // 动态条件：排除当前会话时才引入 jti 参数，避免 null 参数类型推断失败
  const rows = await db`
    UPDATE clinical.user_sessions
      SET revoked_at = now(), revoke_reason = ${reason}
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
      ${exceptJti ? db`AND jti <> ${exceptJti}` : db``}`;
  return (rows as unknown as { count: number }).count;
}

/** 列出活跃会话（未吊销、未过期），可按用户筛选。 */
export async function listActiveSessions(
  userId: string | null = null,
  sql?: DbExecutor,
): Promise<UserSession[]> {
  const db = sql ?? getDb();
  // 动态条件：userId 为 null 时不引入参数，避免 PostgreSQL 无法推断参数类型
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)}
    FROM clinical.user_sessions
    WHERE revoked_at IS NULL
      AND access_expires_at > now()
      ${userId ? db`AND user_id = ${userId}` : db``}
    ORDER BY issued_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 回收过期会话（含已过期但未显式吊销的记录），返回删除条数。 */
export async function deleteExpiredSessions(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    DELETE FROM clinical.user_sessions
    WHERE refresh_expires_at < now()`;
  return (rows as unknown as { count: number }).count;
}
