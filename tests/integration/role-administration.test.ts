/**
 * 健澜科技 jlmedaios - 角色与权限管理 集成测试（M8-B）
 *
 * 直连真实 PostgreSQL，对 BFF 角色管理路由（无 mock）验证：
 *  - 角色列表（含权限码、用户数、是否系统内置）；
 *  - 角色详情（含关联用户）；权限目录（按模块分组）；
 *  - 新建/编辑自定义角色，为角色分配权限（整体替换）；
 *  - 安全护栏：系统内置角色不可删、有用户角色不可删、重复 code 409、
 *    不存在权限码 400、非法 code 400；
 *  - 权限：无 role:manage 403、无 system:perm:manage 403、未登录 401。
 *
 * 测试角色 code 以 m8b_test_ 开头，afterAll 硬删除（含 role_permissions）。
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
import { roleAdminRoutes } from '../../src/bff/routes/admin/roles.js';
import type { Ctx } from '../../src/bff/types.js';

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

const TEST_PREFIX = 'm8b_test_';

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 硬删除测试角色（含权限与用户关联）
    await db`DELETE FROM iam.role_permissions WHERE role_code LIKE ${TEST_PREFIX + '%'}`;
    await db`DELETE FROM iam.user_roles WHERE role_code LIKE ${TEST_PREFIX + '%'}`;
    await db`DELETE FROM iam.roles WHERE code LIKE ${TEST_PREFIX + '%'}`;
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
    rawBody: null,
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

function route(method: string, path: string) {
  return roleAdminRoutes.find((r) => r.method === method && r.path === path)!;
}

let seq = 0;
function uniqueCode(): string {
  seq += 1;
  return `${TEST_PREFIX}${Date.now()}_${seq}`;
}

describe.skipIf(!dbAvailable)('M8-B 角色与权限管理（真实库）', () => {
  it('列表：返回全部角色，含权限码、用户数、系统标记', async () => {
    const res = await route('GET', '/api/v1/admin/roles').handle(makeCtx({ view: admin }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(7);
    const adminRole = body.data.find((r: { code: string }) => r.code === 'admin');
    expect(adminRole.isSystem).toBe(true);
    expect(Array.isArray(adminRole.permissionCodes)).toBe(true);
    expect(adminRole.permissionCodes.length).toBeGreaterThan(0);
    expect(typeof adminRole.userCount).toBe('number');
  });

  it('详情：返回角色 + 关联用户', async () => {
    const res = await route('GET', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code: 'doctor' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role.code).toBe('doctor');
    expect(Array.isArray(body.data.users)).toBe(true);
  });

  it('详情：角色不存在 → 404', async () => {
    const res = await route('GET', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code: 'no_such_role_xx' } }),
    );
    expect(res.status).toBe(404);
  });

  it('权限目录：按模块分组', async () => {
    const res = await route('GET', '/api/v1/admin/permissions').handle(
      makeCtx({ view: admin }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    const systemGroup = body.data.find((g: { module: string }) => g.module === 'system');
    expect(systemGroup).toBeTruthy();
    expect(systemGroup.permissions.length).toBe(systemGroup.count);
  });

  it('新建：自定义角色，isSystem=false', async () => {
    const code = uniqueCode();
    const res = await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '测试角色', description: '集成测试' } }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.code).toBe(code);
    expect(body.data.isSystem).toBe(false);
    expect(body.data.userCount).toBe(0);
  });

  it('新建：重复 code → 409', async () => {
    const code = uniqueCode();
    await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '第一次' } }),
    );
    const res = await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '第二次' } }),
    );
    expect(res.status).toBe(409);
  });

  it('新建：非法 code（含大写/连字符）→ 400', async () => {
    const res = await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code: 'Bad-Role', name: '非法' } }),
    );
    expect(res.status).toBe(400);
  });

  it('编辑：名称/描述更新', async () => {
    const code = uniqueCode();
    await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '原名' } }),
    );
    const res = await route('PUT', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code }, body: { name: '新名', description: '新描述' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('新名');
    expect(body.data.description).toBe('新描述');
  });

  it('编辑：角色不存在 → 404', async () => {
    const res = await route('PUT', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code: 'missing_role_xx' }, body: { name: 'x' } }),
    );
    expect(res.status).toBe(404);
  });

  it('分配权限：整体替换，权限码落库', async () => {
    const code = uniqueCode();
    await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '待分配' } }),
    );
    const res = await route('PUT', '/api/v1/admin/roles/:code/permissions').handle(
      makeCtx({
        view: admin,
        params: { code },
        body: { permissionCodes: ['system:audit:view', 'system:user:view'] },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.permissionCodes).toContain('system:audit:view');
    expect(body.data.permissionCodes).toContain('system:user:view');
    expect(body.data.permissionCodes.length).toBe(2);
  });

  it('分配权限：不存在权限码 → 400', async () => {
    const code = uniqueCode();
    await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '非法权限' } }),
    );
    const res = await route('PUT', '/api/v1/admin/roles/:code/permissions').handle(
      makeCtx({
        view: admin,
        params: { code },
        body: { permissionCodes: ['fake:no:permission'] },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('删除：系统内置角色 → 400', async () => {
    const res = await route('DELETE', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code: 'admin' } }),
    );
    expect(res.status).toBe(400);
  });

  it('删除：仍有用户关联的自定义角色 → 409', async () => {
    const code = uniqueCode();
    await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '有用户角色' } }),
    );
    // 直接插入一条用户关联（admin 用户），模拟有用户关联
    const adminId = admin.id;
    await getDb()`
      INSERT INTO iam.user_roles (user_id, role_code, data_scope, granted_by)
      VALUES (${adminId}, ${code}, 'all', ${adminId})
    `;
    const res = await route('DELETE', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code } }),
    );
    expect(res.status).toBe(409);
    // 解除关联后可删除
    await getDb()`DELETE FROM iam.user_roles WHERE user_id = ${adminId} AND role_code = ${code}`;
    const retry = await route('DELETE', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code } }),
    );
    expect(retry.status).toBe(200);
  });

  it('删除：无用户的自定义角色 → 成功', async () => {
    const code = uniqueCode();
    await route('POST', '/api/v1/admin/roles').handle(
      makeCtx({ view: admin, body: { code, name: '待删除' } }),
    );
    const res = await route('DELETE', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code } }),
    );
    expect(res.status).toBe(200);
    // 回查已不存在
    const check = await route('GET', '/api/v1/admin/roles/:code').handle(
      makeCtx({ view: admin, params: { code } }),
    );
    expect(check.status).toBe(404);
  });

  it('权限：doctor 无 role:manage 访问角色列表 → 403', async () => {
    const res = await route('GET', '/api/v1/admin/roles').handle(
      makeCtx({ view: doctorChen }),
    );
    expect(res.status).toBe(403);
  });

  it('权限：doctor 无 system:perm:manage 访问权限目录 → 403', async () => {
    const res = await route('GET', '/api/v1/admin/permissions').handle(
      makeCtx({ view: doctorChen }),
    );
    expect(res.status).toBe(403);
  });

  it('权限：未登录访问角色列表 → 401', async () => {
    const res = await route('GET', '/api/v1/admin/roles').handle(makeCtx({}));
    expect(res.status).toBe(401);
  });
});
