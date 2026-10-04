/**
 * 健澜科技 jlmedaios - 会话管理与 JWT 主动吊销 集成测试（M7-F）
 *
 * 直连真实 PostgreSQL，对 BFF 路由与中间件（无 mock）验证：
 *  - 登录登记会话（jti 落库）；登出吊销会话，旧 access/refresh 立即失效；
 *  - 刷新轮换：旧会话吊销、新会话有效、旧 access 被拦截；
 *  - sessionGuard：有效会话放行、失效会话清空 ctx.user；
 *  - admin（session:manage）列出会话、按 jti 吊销、按 userId 强制下线；
 *  - doctor 无 session:manage 403；未登录 401；参数缺失 400；吊销不存在 404。
 *
 * 模式说明：全量测试默认 DEMO_MODE=1（见 tests/support/testEnv.ts），此时登录
 * 路由不登记会话，核心闭环用例只在真实模式（TEST_REAL=1）运行；权限/参数
 * 校验不依赖落库，默认模式即可运行。
 *
 * 测试产生的会话按 jti 在 afterAll 硬删除，不污染在线会话。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
} from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import {
  getActiveByJti,
  getActiveByRefreshJti,
} from '../../src/db/repositories/sessionRepo.js';
import { authRoutes } from '../../src/bff/routes/auth.js';
import { sessionAdminRoutes } from '../../src/bff/routes/sessions.js';
import {
  enforceSession,
  clearSessionCache,
} from '../../src/bff/middleware/sessionGuard.js';
import { verifyJwt } from '../../src/bff/middleware/auth.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

// 核心闭环（登录登记/登出/刷新）只在真实模式有意义
const realMode = process.env.DEMO_MODE !== '1';

let admin: AuthView;
let doctorChen: AuthView;
if (dbAvailable) {
  const au = await getUserByUsername('admin');
  admin = buildAuthView(au!, await getUserRoleLinks(au!.id));
  const dc = await getUserByUsername('doctor_chen');
  doctorChen = buildAuthView(dc!, await getUserRoleLinks(dc!.id));
}

// 收集测试产生的会话 jti（access/refresh），afterAll 硬删除
const createdJtis = new Set<string>();

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    const jtis = [...createdJtis];
    if (jtis.length) {
      await db`DELETE FROM clinical.user_sessions WHERE jti IN ${db(jtis)} OR refresh_jti IN ${db(jtis)}`;
    }
    for (const j of jtis) clearSessionCache(j);
    await closeDbForTest();
  }
});

function makeCtx(opts: {
  view?: AuthView | null;
  jti?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
} = {}): Ctx {
  const view = opts.view === undefined ? null : opts.view;
  const user = view
    ? {
        id: view.id,
        name: view.realName,
        roles: view.rawRoles,
        permissions: view.permissions,
        jti: opts.jti,
      }
    : null;
  const req = new Request('http://localhost/api', { headers: opts.headers });
  return {
    req,
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    rawBody: null,
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

function authRoute(method: string, path: string) {
  return authRoutes.find((r) => r.method === method && r.path === path)!;
}
function adminRoute(method: string, path: string) {
  return sessionAdminRoutes.find((r) => r.method === method && r.path === path)!;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  accessJti: string;
  refreshJti: string;
}

/** 走真实登录路由，返回令牌与 jti，并登记待清理。 */
async function login(username: string): Promise<LoginResult> {
  const res = await authRoute('POST', '/api/v1/auth/login').handle(
    makeCtx({ body: { username, password: 'x' } }),
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  const accessToken: string = body.data.tokens.accessToken;
  const refreshToken: string = body.data.tokens.refreshToken;
  const accessPayload = verifyJwt(accessToken)!;
  const refreshPayload = verifyJwt(refreshToken)!;
  createdJtis.add(accessPayload.jti!);
  createdJtis.add(refreshPayload.jti!);
  return {
    accessToken,
    refreshToken,
    accessJti: accessPayload.jti!,
    refreshJti: refreshPayload.jti!,
  };
}

describe.skipIf(!dbAvailable || !realMode)('M7-F 会话闭环（真实模式）', () => {
  it('登录成功：会话落库，jti 与令牌一致且为活跃态', async () => {
    const r = await login('doctor_chen');
    const session = await getActiveByJti(r.accessJti);
    expect(session).toBeTruthy();
    expect(session!.jti).toBe(r.accessJti);
    expect(session!.refreshJti).toBe(r.refreshJti);
    expect(session!.userId).toBe(doctorChen.id);
    expect(session!.revokedAt).toBeNull();
  });

  it('登出：吊销当前会话，旧 access 令牌立即失效（sessionGuard 拦截）', async () => {
    const r = await login('doctor_chen');
    expect(await getActiveByJti(r.accessJti)).toBeTruthy();
    const logoutRes = await authRoute('POST', '/api/v1/auth/logout').handle(
      makeCtx({ view: doctorChen, jti: r.accessJti }),
    );
    expect(logoutRes.status).toBe(200);
    expect(await getActiveByJti(r.accessJti)).toBeNull();
    // sessionGuard 用旧 access jti：清空 ctx.user
    clearSessionCache(r.accessJti);
    const ctx = makeCtx({ view: doctorChen, jti: r.accessJti });
    await enforceSession(ctx);
    expect(ctx.user).toBeNull();
  });

  it('登出后：旧 refresh 令牌也失效，刷新返回 401', async () => {
    const r = await login('doctor_chen');
    await authRoute('POST', '/api/v1/auth/logout').handle(
      makeCtx({ view: doctorChen, jti: r.accessJti }),
    );
    const refreshRes = await authRoute('POST', '/api/v1/auth/refresh').handle(
      makeCtx({ body: { refreshToken: r.refreshToken } }),
    );
    expect(refreshRes.status).toBe(401);
    const body = await refreshRes.json();
    expect(body.code).toBe(40100);
  });

  it('刷新轮换：旧会话吊销、新会话有效、旧 access 被拦截', async () => {
    const r = await login('doctor_chen');
    const refreshRes = await authRoute('POST', '/api/v1/auth/refresh').handle(
      makeCtx({ body: { refreshToken: r.refreshToken } }),
    );
    expect(refreshRes.status).toBe(200);
    const body = await refreshRes.json();
    const newAccess: string = body.data.tokens.accessToken;
    const newRefresh: string = body.data.tokens.refreshToken;
    const newAccessJti = verifyJwt(newAccess)!.jti!;
    const newRefreshJti = verifyJwt(newRefresh)!.jti!;
    createdJtis.add(newAccessJti);
    createdJtis.add(newRefreshJti);
    // 旧会话已吊销
    expect(await getActiveByJti(r.accessJti)).toBeNull();
    expect(await getActiveByRefreshJti(r.refreshJti)).toBeNull();
    // 新会话有效
    expect(await getActiveByJti(newAccessJti)).toBeTruthy();
    expect(await getActiveByRefreshJti(newRefreshJti)).toBeTruthy();
    // 旧 access jti 被 sessionGuard 拦截
    const ctx = makeCtx({ view: doctorChen, jti: r.accessJti });
    await enforceSession(ctx);
    expect(ctx.user).toBeNull();
  });

  it('sessionGuard：有效会话放行，user 保留', async () => {
    const r = await login('doctor_chen');
    const ctx = makeCtx({ view: doctorChen, jti: r.accessJti });
    await enforceSession(ctx);
    expect(ctx.user).toBeTruthy();
    expect(ctx.user!.jti).toBe(r.accessJti);
  });

  it('sessionGuard：无 jti 的旧令牌不强制（放行）', async () => {
    const ctx = makeCtx({ view: doctorChen });
    await enforceSession(ctx);
    expect(ctx.user).toBeTruthy();
  });

  it('admin 列出会话：包含刚登录的会话并给总数', async () => {
    const r = await login('doctor_chen');
    const res = await adminRoute('GET', '/api/v1/admin/sessions').handle(
      makeCtx({ view: admin, jti: crypto.randomUUID(), query: { limit: '100' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    const found = body.data.items.find((s: { jti: string }) => s.jti === r.accessJti);
    expect(found).toBeTruthy();
    expect(found.userId).toBe(doctorChen.id);
  });

  it('admin 按 jti 吊销：200，会话变为非活跃', async () => {
    const r = await login('doctor_chen');
    const res = await adminRoute('POST', '/api/v1/admin/sessions/revoke').handle(
      makeCtx({ view: admin, jti: crypto.randomUUID(), body: { jti: r.accessJti } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(1);
    expect(await getActiveByJti(r.accessJti)).toBeNull();
  });

  it('admin 按 userId 强制下线：200，该用户会话全部吊销', async () => {
    const r = await login('doctor_chen');
    const res = await adminRoute('POST', '/api/v1/admin/sessions/revoke').handle(
      makeCtx({
        view: admin,
        jti: crypto.randomUUID(),
        body: { userId: doctorChen.id },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBeGreaterThanOrEqual(1);
    expect(await getActiveByJti(r.accessJti)).toBeNull();
  });

  it('吊销不存在的 jti：404', async () => {
    const res = await adminRoute('POST', '/api/v1/admin/sessions/revoke').handle(
      makeCtx({
        view: admin,
        jti: crypto.randomUUID(),
        body: { jti: crypto.randomUUID() },
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe(40400);
  });
});

describe.skipIf(!dbAvailable)('M7-F 权限与参数校验（默认模式可跑）', () => {
  it('缺少 jti/userId：400', async () => {
    const res = await adminRoute('POST', '/api/v1/admin/sessions/revoke').handle(
      makeCtx({ view: admin, jti: crypto.randomUUID(), body: {} }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
  });

  it('doctor 无 session:manage：列出会话 403', async () => {
    const res = await adminRoute('GET', '/api/v1/admin/sessions').handle(
      makeCtx({ view: doctorChen, jti: crypto.randomUUID() }),
    );
    expect(res.status).toBe(403);
  });

  it('doctor 强制下线：403', async () => {
    const res = await adminRoute('POST', '/api/v1/admin/sessions/revoke').handle(
      makeCtx({
        view: doctorChen,
        jti: crypto.randomUUID(),
        body: { userId: doctorChen.id },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('未登录：列出会话 401', async () => {
    const res = await adminRoute('GET', '/api/v1/admin/sessions').handle(makeCtx());
    expect(res.status).toBe(401);
  });
});
