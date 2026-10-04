/**
 * 健澜科技 jlmedaios - 审计日志与登录日志查询 集成测试（M8-C）
 *
 * 直连真实 PostgreSQL，对 BFF 审计/登录日志路由（无 mock）验证：
 *  - 审计日志：列表分页、概览、分布、趋势、详情、非法 seq 400、不存在 404；
 *  - 登录日志：列表、概览、趋势；登录尝试落库后可被查询；
 *  - 强制下线：权限（doctor 403、未登录 401）、非法 userId 400、
 *    对不存在用户执行返回 200 revoked=0；
 *  - 权限：无 system:audit:view / system:loginlog:view 403、未登录 401。
 *
 * 测试登录尝试 username 以 m8c_test_ 开头，afterAll 硬删除。
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
import { recordLoginAttempt } from '../../src/db/repositories/loginAttemptRepo.js';
import { auditLogRoutes } from '../../src/bff/routes/admin/auditLogs.js';
import { loginLogRoutes } from '../../src/bff/routes/admin/loginLogs.js';
import type { Ctx, RouteDef } from '../../src/bff/types.js';

let dbAvailable = false;
try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

let admin: AuthView;
let doctorChen: AuthView;
if (dbAvailable) {
  const au = await getUserByUsername('admin');
  admin = buildAuthView(au!, await getUserRoleLinks(au!.id));
  const dc = await getUserByUsername('doctor_chen');
  doctorChen = buildAuthView(dc!, await getUserRoleLinks(dc!.id));
}

const TEST_USERNAME = 'm8c_test_user';

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM iam.login_attempts WHERE username LIKE ${'m8c_test_%'}`;
    await closeDbForTest();
  }
});

function makeCtx(opts: {
  view?: AuthView | null;
  body?: unknown;
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
      }
    : null;
  const req = new Request('http://localhost/api');
  return {
    req,
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    clientIp: '127.0.0.1',
    rawBody: null,
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

function findRoute(routes: RouteDef[], method: string, path: string) {
  return routes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M8-C 审计日志（真实库）', () => {
  it('列表：分页返回，code=0，items 为数组', async () => {
    const res = await findRoute(auditLogRoutes, 'GET', '/api/v1/admin/audit-logs').handle(
      makeCtx({ view: admin, query: { page: '1', pageSize: '10' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.pageSize).toBe(10);
    expect(typeof body.data.total).toBe('number');
  });

  it('筛选：按结果 success 查询', async () => {
    const res = await findRoute(auditLogRoutes, 'GET', '/api/v1/admin/audit-logs').handle(
      makeCtx({ view: admin, query: { result: 'success', pageSize: '10' } }),
    );
    const body = await res.json();
    for (const item of body.data.items) {
      expect(item.result).toBe('success');
    }
  });

  it('概览：返回 total/today/abnormal/highRisk', async () => {
    const res = await findRoute(
      auditLogRoutes,
      'GET',
      '/api/v1/admin/audit-logs/overview',
    ).handle(makeCtx({ view: admin }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.data.total).toBe('number');
    expect(typeof body.data.today).toBe('number');
    expect(typeof body.data.abnormal).toBe('number');
    expect(typeof body.data.highRisk).toBe('number');
  });

  it('分布：按操作类型聚合', async () => {
    const res = await findRoute(
      auditLogRoutes,
      'GET',
      '/api/v1/admin/audit-logs/distribution',
    ).handle(makeCtx({ view: admin }));
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(typeof body.data[0].action).toBe('string');
      expect(typeof body.data[0].count).toBe('number');
    }
  });

  it('趋势：返回近 N 天数组', async () => {
    const res = await findRoute(
      auditLogRoutes,
      'GET',
      '/api/v1/admin/audit-logs/trend',
    ).handle(makeCtx({ view: admin, query: { days: '7' } }));
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(7);
  });

  it('详情：取列表首条可正常返回', async () => {
    const list = await findRoute(auditLogRoutes, 'GET', '/api/v1/admin/audit-logs').handle(
      makeCtx({ view: admin, query: { pageSize: '1' } }),
    );
    const listBody = await list.json();
    expect(listBody.data.items.length).toBeGreaterThan(0);
    const seq = listBody.data.items[0].seq;
    const res = await findRoute(
      auditLogRoutes,
      'GET',
      '/api/v1/admin/audit-logs/:seq',
    ).handle(makeCtx({ view: admin, params: { seq: String(seq) } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.seq).toBe(seq);
  });

  it('详情：非法 seq → 400', async () => {
    const res = await findRoute(
      auditLogRoutes,
      'GET',
      '/api/v1/admin/audit-logs/:seq',
    ).handle(makeCtx({ view: admin, params: { seq: 'abc' } }));
    expect(res.status).toBe(400);
  });

  it('详情：不存在 → 404', async () => {
    const res = await findRoute(
      auditLogRoutes,
      'GET',
      '/api/v1/admin/audit-logs/:seq',
    ).handle(makeCtx({ view: admin, params: { seq: '999999999' } }));
    expect(res.status).toBe(404);
  });

  it('权限：doctor 无 system:audit:view → 403', async () => {
    const res = await findRoute(auditLogRoutes, 'GET', '/api/v1/admin/audit-logs').handle(
      makeCtx({ view: doctorChen }),
    );
    expect(res.status).toBe(403);
  });

  it('权限：未登录 → 401', async () => {
    const res = await findRoute(auditLogRoutes, 'GET', '/api/v1/admin/audit-logs').handle(
      makeCtx({ view: null }),
    );
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!dbAvailable)('M8-C 登录日志与登录尝试（真实库）', () => {
  it('登录尝试落库：成功/失败各一条，可在列表查询', async () => {
    await recordLoginAttempt({
      username: TEST_USERNAME,
      success: false,
      failReason: '用户名或密码错误',
    });
    await recordLoginAttempt({ username: TEST_USERNAME, success: true });
    const res = await findRoute(loginLogRoutes, 'GET', '/api/v1/admin/login-logs').handle(
      makeCtx({ view: admin, query: { keyword: TEST_USERNAME, pageSize: '10' } }),
    );
    const body = await res.json();
    const found = body.data.items.filter((i: { username: string }) => i.username === TEST_USERNAME);
    expect(found.length).toBe(2);
  });

  it('列表：分页返回，code=0', async () => {
    const res = await findRoute(loginLogRoutes, 'GET', '/api/v1/admin/login-logs').handle(
      makeCtx({ view: admin, query: { page: '1', pageSize: '10' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('筛选：仅失败 success=false', async () => {
    const res = await findRoute(loginLogRoutes, 'GET', '/api/v1/admin/login-logs').handle(
      makeCtx({ view: admin, query: { success: 'false', pageSize: '20' } }),
    );
    const body = await res.json();
    for (const item of body.data.items) {
      expect(item.success).toBe(false);
    }
  });

  it('概览：today/online/todayFail/failRate', async () => {
    const res = await findRoute(
      loginLogRoutes,
      'GET',
      '/api/v1/admin/login-logs/overview',
    ).handle(makeCtx({ view: admin }));
    const body = await res.json();
    expect(typeof body.data.today).toBe('number');
    expect(typeof body.data.online).toBe('number');
    expect(typeof body.data.failRate).toBe('number');
  });

  it('趋势：近 7 天数组', async () => {
    const res = await findRoute(
      loginLogRoutes,
      'GET',
      '/api/v1/admin/login-logs/trend',
    ).handle(makeCtx({ view: admin, query: { days: '7' } }));
    const body = await res.json();
    expect(body.data.length).toBe(7);
  });

  it('权限：doctor 无 system:loginlog:view → 403', async () => {
    const res = await findRoute(loginLogRoutes, 'GET', '/api/v1/admin/login-logs').handle(
      makeCtx({ view: doctorChen }),
    );
    expect(res.status).toBe(403);
  });

  it('强制下线：doctor 无 session:manage → 403', async () => {
    const res = await findRoute(
      loginLogRoutes,
      'POST',
      '/api/v1/admin/login-logs/force-logout',
    ).handle(makeCtx({ view: doctorChen, body: { userId: admin.id } }));
    expect(res.status).toBe(403);
  });

  it('强制下线：未登录 → 401', async () => {
    const res = await findRoute(
      loginLogRoutes,
      'POST',
      '/api/v1/admin/login-logs/force-logout',
    ).handle(makeCtx({ view: null, body: { userId: admin.id } }));
    expect(res.status).toBe(401);
  });

  it('强制下线：非法 userId → 400', async () => {
    const res = await findRoute(
      loginLogRoutes,
      'POST',
      '/api/v1/admin/login-logs/force-logout',
    ).handle(makeCtx({ view: admin, body: { userId: 'not-a-uuid' } }));
    expect(res.status).toBe(400);
  });

  it('强制下线：对不存在用户执行 → 200 revoked=0', async () => {
    const fakeUserId = '00000000-0000-4000-8000-000000000001';
    const res = await findRoute(
      loginLogRoutes,
      'POST',
      '/api/v1/admin/login-logs/force-logout',
    ).handle(makeCtx({ view: admin, body: { userId: fakeUserId } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(0);
  });
});
