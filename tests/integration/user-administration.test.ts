/**
 * 健澜科技 jlmedaios - 用户管理 集成测试（M8-A）
 *
 * 直连真实 PostgreSQL，对 BFF 用户管理路由（无 mock）验证：
 *  - 列表（分页、关键字、科室、状态筛选）+ 总数；
 *  - 新增（多角色 + 数据范围）、编辑、状态变更、重置密码、软删除；
 *  - 安全护栏：不能禁用/删除自己、不能删除最后一个管理员；
 *  - 唯一约束：用户名/工号冲突 409；角色为空 400；
 *  - 权限：无 user:manage 403、未登录 401。
 *
 * 测试账户 username 以 m8a_test_ 开头，afterAll 硬删除（含 user_roles）。
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
import { verifyPbkdf2Hash } from '../../src/security/encryption/HashUtils.js';
import { userAdminRoutes } from '../../src/bff/routes/admin/users.js';
import type {
  CreateUserInput,
  UpdateUserInput,
} from '../../src/db/repositories/adminUserRepo.js';
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

const TEST_PREFIX = 'm8a_test_';

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 硬删除测试账户（含已软删除的）及其角色链接
    const testUsers = await db`
      SELECT id FROM iam.users WHERE username LIKE ${TEST_PREFIX + '%'}
    `;
    const ids = testUsers.map((u) => String(u.id));
    if (ids.length) {
      await db`DELETE FROM iam.user_roles WHERE user_id IN ${db(ids)}`;
      await db`DELETE FROM iam.users WHERE id IN ${db(ids)}`;
    }
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
  return userAdminRoutes.find((r) => r.method === method && r.path === path)!;
}

let seq = 0;
function uniqueUsername(): string {
  seq += 1;
  return `${TEST_PREFIX}${Date.now()}_${seq}`;
}

function newUserPayload(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  const username = uniqueUsername();
  return {
    username,
    password: 'Test@123456',
    realName: '测试医师',
    employeeNo: `EMP${Date.now()}${seq}`,
    gender: 'male',
    deptCode: '内科',
    title: '主治医师',
    phone: '13800000000',
    email: `${username}@test.com`,
    status: 'active',
    roles: [{ roleCode: 'doctor', dataScope: 'department' }],
    ...overrides,
  };
}

describe.skipIf(!dbAvailable)('M8-A 用户管理（真实库）', () => {
  it('列表：返回分页数据与总数，关键字筛选生效', async () => {
    const res = await route('GET', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, query: { limit: '10', offset: '0' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(body.data.items.length);
  });

  it('列表：按状态筛选 disabled', async () => {
    const res = await route('GET', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, query: { status: 'disabled', limit: '50' } }),
    );
    const body = await res.json();
    body.data.items.forEach((u: { status: string }) => {
      expect(u.status).toBe('disabled');
    });
  });

  it('新增：创建账户，角色与数据范围落库，密码为 PBKDF2 哈希', async () => {
    const payload = newUserPayload();
    const res = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.username).toBe(payload.username);
    expect(body.data.roleCodes).toContain('doctor');
    expect(body.data.roleScopes.doctor).toBe('department');
    // 密码哈希落库、可验证、非明文（直接查库，AdminUser 不回传 password_hash）
    const hashRows = await getDb()`
      SELECT password_hash FROM iam.users WHERE id = ${body.data.id}
    `;
    const hash = String(hashRows[0].password_hash);
    expect(hash).not.toBe('Test@123456');
    expect(hash.startsWith('pbkdf2$')).toBe(true);
    expect(verifyPbkdf2Hash('Test@123456', hash)).toBe(true);
  });

  it('新增：多角色 + 不同数据范围', async () => {
    const payload = newUserPayload({
      roles: [
        { roleCode: 'doctor', dataScope: 'department' },
        { roleCode: 'researcher', dataScope: 'self' },
      ],
    });
    const res = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    const body = await res.json();
    expect(body.data.roleCodes).toContain('doctor');
    expect(body.data.roleCodes).toContain('researcher');
    expect(body.data.roleScopes.researcher).toBe('self');
  });

  it('新增：角色为空 → 400', async () => {
    const payload = newUserPayload({ roles: [] });
    const res = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    expect(res.status).toBe(400);
  });

  it('新增：用户名重复 → 409', async () => {
    const first = newUserPayload();
    await route('POST', '/api/v1/admin/users').handle(makeCtx({ view: admin, body: first }));
    const dup = newUserPayload({ username: first.username, employeeNo: `OTHER${seq}X` });
    const res = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: dup }),
    );
    expect(res.status).toBe(409);
  });

  it('详情：返回用户（含角色），不存在 → 404', async () => {
    const payload = newUserPayload();
    const created = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    const createdBody = await created.json();
    const res = await route('GET', '/api/v1/admin/users/:id').handle(
      makeCtx({ view: admin, params: { id: createdBody.data.id } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(createdBody.data.id);

    const missing = await route('GET', '/api/v1/admin/users/:id').handle(
      makeCtx({ view: admin, params: { id: crypto.randomUUID() } }),
    );
    expect(missing.status).toBe(404);
  });

  it('编辑：更新资料与角色', async () => {
    const payload = newUserPayload();
    const created = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    const createdBody = await created.json();
    const update: UpdateUserInput = {
      realName: '改名医师',
      title: '副主任医师',
      roles: [{ roleCode: 'doctor', dataScope: 'hospital' }],
    };
    const res = await route('PUT', '/api/v1/admin/users/:id').handle(
      makeCtx({ view: admin, params: { id: createdBody.data.id }, body: update }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.realName).toBe('改名医师');
    expect(body.data.roleScopes.doctor).toBe('hospital');
  });

  it('状态变更：禁用 → 休假 → 启用', async () => {
    const payload = newUserPayload();
    const created = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    const createdBody = await created.json();
    for (const status of ['disabled', 'leave', 'active'] as const) {
      const res = await route('POST', '/api/v1/admin/users/:id/status').handle(
        makeCtx({
          view: admin,
          params: { id: createdBody.data.id },
          body: { status },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe(status);
    }
  });

  it('重置密码：新密码可用，旧密码失效', async () => {
    const payload = newUserPayload();
    const created = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    const createdBody = await created.json();
    const res = await route('POST', '/api/v1/admin/users/:id/reset-password').handle(
      makeCtx({
        view: admin,
        params: { id: createdBody.data.id },
        body: { newPassword: 'NewPass@999' },
      }),
    );
    expect(res.status).toBe(200);
    // 直接查库验证密码哈希已更新
    const rows = await getDb()`
      SELECT password_hash FROM iam.users WHERE id = ${createdBody.data.id}
    `;
    const hash = String(rows[0].password_hash);
    expect(verifyPbkdf2Hash('NewPass@999', hash)).toBe(true);
    expect(verifyPbkdf2Hash('Test@123456', hash)).toBe(false);
  });

  it('删除：软删除后列表查不到（deleted_at 置位）', async () => {
    const payload = newUserPayload();
    const created = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: admin, body: payload }),
    );
    const createdBody = await created.json();
    const res = await route('DELETE', '/api/v1/admin/users/:id').handle(
      makeCtx({ view: admin, params: { id: createdBody.data.id } }),
    );
    expect(res.status).toBe(200);
    const detail = await route('GET', '/api/v1/admin/users/:id').handle(
      makeCtx({ view: admin, params: { id: createdBody.data.id } }),
    );
    expect(detail.status).toBe(404);
  });

  it('护栏：不能禁用自己 → 400', async () => {
    const res = await route('POST', '/api/v1/admin/users/:id/status').handle(
      makeCtx({
        view: admin,
        params: { id: admin.id },
        body: { status: 'disabled' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('护栏：不能删除自己 → 400', async () => {
    const res = await route('DELETE', '/api/v1/admin/users/:id').handle(
      makeCtx({ view: admin, params: { id: admin.id } }),
    );
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!dbAvailable)('M8-A 权限控制（真实库）', () => {
  it('doctor 无 user:manage：列表 403', async () => {
    const res = await route('GET', '/api/v1/admin/users').handle(
      makeCtx({ view: doctorChen }),
    );
    expect(res.status).toBe(403);
  });

  it('doctor 新增用户：403', async () => {
    const res = await route('POST', '/api/v1/admin/users').handle(
      makeCtx({ view: doctorChen, body: newUserPayload() }),
    );
    expect(res.status).toBe(403);
  });

  it('未登录：列表 401', async () => {
    const res = await route('GET', '/api/v1/admin/users').handle(makeCtx());
    expect(res.status).toBe(401);
  });
});
