/**
 * 健澜科技数智医院智能体 - MFA 登录挑战 Repository
 *
 * iam.mfa_login_challenges 的持久化：密码校验通过后签发一次性挑战，
 * 用户提交 TOTP/备份码后才换发会话令牌。负责：
 *  - 签发 / 查询 / 标记完成
 *  - 失败计数与暴力破解锁定（达阈值写 locked_until）
 *  - FOR UPDATE 行锁 + 过期清理，保证并发下不重复、不重放
 *
 * DDL：deploy/postgres/init/55-mfa-persistent.sql
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql, type TransactionSql } from '../pool.js';

export interface MfaLoginChallenge {
  challengeId: string;
  userId: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  failedAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
}

interface ChallengeRow {
  challenge_id: string;
  user_id: string;
  expires_at: Date;
  verified_at: Date | null;
  failed_attempts: number;
  locked_until: Date | null;
  created_at: Date;
}

function mapRow(r: ChallengeRow): MfaLoginChallenge {
  return {
    challengeId: String(r.challenge_id),
    userId: String(r.user_id),
    expiresAt: r.expires_at,
    verifiedAt: r.verified_at,
    failedAttempts: Number(r.failed_attempts),
    lockedUntil: r.locked_until,
    createdAt: r.created_at,
  };
}

/** 签发登录挑战（默认 5 分钟有效） */
export async function createLoginChallenge(
  userId: string,
  ttlSeconds = 300,
  sql?: Sql,
): Promise<MfaLoginChallenge> {
  const db = sql ?? getDb();
  const rows = await db<ChallengeRow[]>`
    INSERT INTO iam.mfa_login_challenges (user_id, expires_at)
    VALUES (${userId}::uuid, now() + interval '1 second' * ${ttlSeconds})
    RETURNING challenge_id, user_id, expires_at, verified_at, failed_attempts, locked_until, created_at
  `;
  return mapRow(rows[0]);
}

/** 读取挑战（不持锁，仅用于状态查询） */
export async function getLoginChallenge(
  challengeId: string,
  sql?: Sql,
): Promise<MfaLoginChallenge | null> {
  const db = sql ?? getDb();
  const rows = await db<ChallengeRow[]>`
    SELECT challenge_id, user_id, expires_at, verified_at, failed_attempts, locked_until, created_at
      FROM iam.mfa_login_challenges
     WHERE challenge_id = ${challengeId}::uuid
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

/** 事务内持行锁读取挑战（校验/失败计数的原子操作入口） */
export async function getLoginChallengeForUpdate(
  tx: TransactionSql,
  challengeId: string,
): Promise<MfaLoginChallenge | null> {
  const rows = await tx<ChallengeRow[]>`
    SELECT challenge_id, user_id, expires_at, verified_at, failed_attempts, locked_until, created_at
      FROM iam.mfa_login_challenges
     WHERE challenge_id = ${challengeId}::uuid
     FOR UPDATE
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

/** 标记挑战已完成（幂等：仅当尚未完成时写入 verified_at） */
export async function markChallengeVerified(
  challengeId: string,
  tx: TransactionSql,
): Promise<void> {
  await tx`
    UPDATE iam.mfa_login_challenges
       SET verified_at = now()
     WHERE challenge_id = ${challengeId}::uuid AND verified_at IS NULL
  `;
}

/**
 * 记录一次失败：failed_attempts +1；达到阈值则写入 locked_until（锁定 lockSeconds）。
 * 返回更新后的失败次数与锁定截止时间。
 */
export async function recordChallengeFailure(
  challengeId: string,
  tx: TransactionSql,
  threshold = 5,
  lockSeconds = 900,
): Promise<{ failedAttempts: number; lockedUntil: Date | null }> {
  const rows = await tx<{ failed_attempts: number; locked_until: Date | null }[]>`
    UPDATE iam.mfa_login_challenges
       SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= ${threshold}
                               THEN now() + interval '1 second' * ${lockSeconds}
                               ELSE locked_until END
     WHERE challenge_id = ${challengeId}::uuid
    RETURNING failed_attempts, locked_until
  `;
  return {
    failedAttempts: Number(rows[0].failed_attempts),
    lockedUntil: rows[0].locked_until,
  };
}

/** 清理已过期且未完成的挑战（运维/定时清理；不影响已完成记录） */
export async function purgeExpiredChallenges(sql?: Sql): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ deleted: number }[]>`
    WITH d AS (
      DELETE FROM iam.mfa_login_challenges
       WHERE verified_at IS NULL AND expires_at < now()
      RETURNING 1
    )
    SELECT count(*)::int AS deleted FROM d
  `;
  return Number(rows[0].deleted);
}

/** 取证计数：当前挑战总数 / 未完成挑战数 */
export async function countChallenges(sql?: Sql): Promise<{ total: number; open: number }> {
  const db = sql ?? getDb();
  const rows = await db<{ total: number; open: number }[]>`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE verified_at IS NULL)::int AS open
      FROM iam.mfa_login_challenges
  `;
  return { total: Number(rows[0].total), open: Number(rows[0].open) };
}

/** 取证计数：已持久化的 MFA 因子数 */
export async function countMfaFactors(sql?: Sql): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`
    SELECT count(*)::int AS n FROM iam.mfa_factors
  `;
  return Number(rows[0].n);
}
