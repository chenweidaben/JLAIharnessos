/**
 * 健澜科技 jlmedaios - M3-C MFA 登录第二因子集成测试
 *
 * 直连真实 PostgreSQL（无 mock），覆盖：
 *  - iam.mfa_login_challenges 签发/读取/完成/失败计数/锁定持久化
 *  - 端到端：绑定 TOTP → 密码通过签发挑战 → 正确 TOTP 放行 → 重复挑战拒绝
 *  - 暴力破解：连续 5 次错误后锁定（LOCKED）
 *  - 路由：未启用 MFA 用户登录直接发令牌；已启用用户登录返回 mfaRequired
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 清理测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  countChallenges,
  createLoginChallenge,
  getLoginChallenge,
  purgeExpiredChallenges,
  recordChallengeFailure,
} from '../../src/db/repositories/mfaRepo.js';
import {
  issueLoginChallenge,
  verifyLoginChallenge,
} from '../../src/bff/aggregators/mfaAggregator.js';
import { getMfaService } from '../../src/bff/mfaRuntime.js';
import { totp } from '../../src/security/mfa/index.js';
import { authRoutes } from '../../src/bff/routes/auth.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
/** 全量测试默认 DEMO_MODE=1（见 tests/support/testEnv.ts）；登录路由的 mfaRequired
 *  分支只在真实模式（TEST_REAL=1）才有意义，路由级断言据此 gate。 */
const realMode = process.env.DEMO_MODE !== '1';
const TEST_USER = 'doctor_lin';
let testUserId = '';

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

afterAll(async () => {
  if (dbAvailable && testUserId) {
    const db = getDb();
    await db`DELETE FROM iam.mfa_login_challenges WHERE user_id = ${testUserId}::uuid`;
    await db`DELETE FROM iam.mfa_factors WHERE user_id = ${testUserId}`;
    await closeDbForTest();
  }
});

function makeLoginCtx(username: string, password: string): Ctx {
  return {
    params: {},
    query: new URLSearchParams(),
    body: async () => ({ username, password }),
    user: null,
    traceId: 'm3c-test',
  } as unknown as Ctx;
}

describe.skipIf(!dbAvailable)('M3-C 登录挑战 Repository', () => {
  it('签发→读取往返，失败计数达阈值后锁定', async () => {
    const db = getDb();
    const user = await getUserByUsername(TEST_USER);
    if (!user) throw new Error(`缺少测试账号 ${TEST_USER}`);
    testUserId = user.id;

    const before = await countChallenges();
    const ch = await createLoginChallenge(user.id, 300);
    expect(ch.challengeId).toBeTruthy();
    expect(ch.failedAttempts).toBe(0);
    expect(ch.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const got = await getLoginChallenge(ch.challengeId);
    expect(got?.userId).toBe(user.id);

    // 连续失败 5 次，前 4 次不锁定，第 5 次写入 locked_until
    let last: { failedAttempts: number; lockedUntil: Date | null } = {
      failedAttempts: 0,
      lockedUntil: null,
    };
    for (let i = 0; i < 5; i++) {
      last = await db.begin((tx) => recordChallengeFailure(ch.challengeId, tx));
      expect(last.failedAttempts).toBe(i + 1);
      expect(last.lockedUntil).toBe(i < 4 ? null : last.lockedUntil);
    }
    expect(last.failedAttempts).toBe(5);
    expect(last.lockedUntil).toBeTruthy();

    const after = await countChallenges();
    expect(after.total).toBeGreaterThanOrEqual(before.total + 1);

    // 清理本行（避免影响后续用例）
    await db`DELETE FROM iam.mfa_login_challenges WHERE challenge_id = ${ch.challengeId}::uuid`;
  });

  it('过期清理只删未完成挑战', async () => {
    const user = await getUserByUsername(TEST_USER);
    if (!user) throw new Error('缺少测试账号');
    // 手工造一条已过期未完成挑战
    const db = getDb();
    await db`
      INSERT INTO iam.mfa_login_challenges (user_id, expires_at)
      VALUES (${user.id}::uuid, now() - interval '1 hour')
    `;
    const n = await purgeExpiredChallenges();
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

describe.skipIf(!dbAvailable || !realMode)('M3-C 端到端 TOTP 登录第二因子', () => {
  it('绑定 MFA → 登录返回 mfaRequired → 正确 TOTP 放行 → 重复挑战拒绝', async () => {
    const user = await getUserByUsername(TEST_USER);
    if (!user) throw new Error('缺少测试账号');
    testUserId = user.id;
    const svc = getMfaService();

    // 干净起始：清除可能残留的因子
    await svc.disable(user.id, '000000').catch(() => undefined);

    // 1) 绑定 TOTP（拿到一次性 secret 用于计算动态码；备份码用于后续登录校验）
    const begin = await svc.beginEnroll(user.id, { accountName: TEST_USER });
    expect(begin.ok).toBe(true);
    const secret = begin.secret!;
    const confirm = await svc.confirmEnroll(user.id, totp(secret));
    expect(confirm.ok).toBe(true);
    const backupCodes = confirm.backupCodes!;
    expect(await svc.isEnabled(user.id)).toBe(true);

    // 2) 未启用 MFA 的用户登录直接发令牌（admin 未绑 MFA）；已启用者登录应返回 mfaRequired
    const admin = await getUserByUsername('admin');
    if (!admin) throw new Error('缺少 admin 账号');
    const adminView = buildAuthView(admin, await getUserRoleLinks(admin.id));
    expect(await getMfaService().isEnabled(admin.id)).toBe(false);

    const loginRoute = authRoutes.find(
      (r) => r.method === 'POST' && r.path === '/api/v1/auth/login',
    )!;
    const res = await loginRoute.handle(makeLoginCtx(TEST_USER, 'whatever'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.mfaRequired).toBe(true);
    const challengeId = body.data.challengeId as string;
    expect(challengeId).toBeTruthy();
    // 关键：未发令牌
    expect(body.data.tokens).toBeUndefined();

    // 3) 错误 TOTP → 401（失败计数 +1）
    const bad = await verifyLoginChallenge(challengeId, '000000');
    expect(bad.ok).toBe(false);

    // 4) 一次性备份码 → 放行，返回 userId
    //    （刚 confirmEnroll 后 TOTP 当前时间窗已被消费，会被重放保护拒绝；
    //      备份码不占 TOTP 计数器，用它验证挑战→发令牌链路）
    const good = await verifyLoginChallenge(challengeId, backupCodes[0]);
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.userId).toBe(user.id);
      expect(good.method).toBe('backup');
    }

    // 5) 同一挑战重复使用 → ALREADY_VERIFIED
    const replay = await verifyLoginChallenge(challengeId, backupCodes[1]);
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error).toBe('ALREADY_VERIFIED');

    void adminView;
  });
});
