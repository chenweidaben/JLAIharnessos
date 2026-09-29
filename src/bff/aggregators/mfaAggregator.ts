/**
 * 健澜科技数智医院智能体 - MFA 登录第二因子聚合器
 *
 * 密码校验通过后：若用户已启用 MFA，则不直接发会话令牌，而是签发一次性登录挑战；
 * 用户提交 TOTP/备份码并通过本聚合器校验后，才由路由层换发 JWT。
 *
 * 安全要点：
 *  - 挑战行 SELECT ... FOR UPDATE 持锁，并发下串行化校验，不重复放行；
 *  - 失败计数落库，连续 5 次失败锁定 15 分钟（防暴力破解）；
 *  - 过期/已完成/不存在的挑战一律拒绝，且不发任何令牌。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '@/db/pool.js';
import {
  createLoginChallenge,
  getLoginChallengeForUpdate,
  markChallengeVerified,
  recordChallengeFailure,
} from '@/db/repositories/mfaRepo.js';
import { getMfaService } from '../mfaRuntime.js';

export type VerifyLoginChallengeResult =
  | { ok: true; userId: string; method: 'totp' | 'backup' }
  | {
      ok: false;
      error: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_VERIFIED' | 'LOCKED' | 'INVALID_TOKEN';
      failedAttempts?: number;
      lockedUntil?: Date | null;
    };

/** 密码通过后签发登录第二因子挑战（5 分钟有效） */
export async function issueLoginChallenge(userId: string, ttlSeconds = 300) {
  return createLoginChallenge(userId, ttlSeconds);
}

/**
 * 校验登录第二因子。在事务内持行锁读取挑战：
 *  - 不存在 / 已过期 / 已完成 / 锁定 → 拒绝
 *  - TOTP 或备份码正确 → 标记完成，返回 userId 由路由发令牌
 *  - 错误 → 失败计数 +1，达阈值则锁定
 */
export async function verifyLoginChallenge(
  challengeId: string,
  token: string,
  threshold = 5,
  lockSeconds = 900,
): Promise<VerifyLoginChallengeResult> {
  const normalized = (token ?? '').trim();
  return withTx(async (tx) => {
    const ch = await getLoginChallengeForUpdate(tx, challengeId);
    if (!ch) return { ok: false, error: 'NOT_FOUND' };
    if (ch.verifiedAt) return { ok: false, error: 'ALREADY_VERIFIED' };
    if (ch.expiresAt.getTime() <= Date.now()) return { ok: false, error: 'EXPIRED' };
    if (ch.lockedUntil && ch.lockedUntil.getTime() > Date.now()) {
      return { ok: false, error: 'LOCKED', lockedUntil: ch.lockedUntil };
    }

    const result = await getMfaService().verify(ch.userId, normalized);
    if (!result.ok) {
      const { failedAttempts, lockedUntil } = await recordChallengeFailure(
        challengeId,
        tx,
        threshold,
        lockSeconds,
      );
      return { ok: false, error: 'INVALID_TOKEN', failedAttempts, lockedUntil };
    }

    await markChallengeVerified(challengeId, tx);
    return { ok: true, userId: ch.userId, method: result.method };
  });
}
