/**
 * 健澜科技 jlmedaios - 多租户持久化集成测试（M5-A）
 *
 * 直接对真实 PostgreSQL 验证租户/院区注册表的持久化（无 mock）：
 *  - hydrate 从 iam.tenants 加载节点；
 *  - persistCreateHospital / persistCreateCampus 落库；
 *  - persistSetEnabled / persistMergeConfig / persistSoftDelete 落库，软删级联院区；
 *  - 默认医院租户受保护（不可停用/删除）；
 *  - 数据库层级 CHECK 约束（医院无 parent、院区有 parent）；
 *  - 重启模拟：全新 TenantService hydrate 后能读到此前持久化的节点；
 *  - BFF 路由：非 admin 403、未认证 401。
 *
 * 隔离：测试节点名称以 M5A_TEST_ 标记，afterAll 物理删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { verifyDbConnection, getDb, type DbExecutor } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import { TenantService } from '../../src/tenant/TenantService.js';
import { getTenantById } from '../../src/db/repositories/tenantRepo.js';
import { tenantAdminRoutes } from '../../src/bff/routes/admin/tenants.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctor: AuthView;

const tag = `M5A_TEST_${Date.now().toString(36)}`;
const createdIds: string[] = [];

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctor = await load('doctor_li');
}

afterAll(async () => {
  if (!dbAvailable) return;
  const sql = getDb();
  // 物理删除测试节点（按名称标记；含软删节点）
  await sql`DELETE FROM iam.tenants WHERE name LIKE ${tag + '%'}`;
  // 兜底：按记录的 id 删除
  if (createdIds.length > 0) {
    await sql`DELETE FROM iam.tenants WHERE id = ANY(${createdIds})`;
  }
});

describe.skipIf(!dbAvailable || !realMode)('M5-A 多租户持久化（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
    return;
  }

  it('hydrate 从库加载租户/院区节点（含默认医院与院区）', async () => {
    const svc = new TenantService();
    const count = await svc.hydrate();
    expect(count).toBeGreaterThanOrEqual(2);
    // 默认医院与院区在加载后可解析
    expect(svc.resolveActive('demo-hospital').level).toBe('hospital');
    expect(svc.resolveActive('main-campus').parentId).toBe('demo-hospital');
  });

  it('persistCreateHospital 落库，可直接从库回查', async () => {
    const svc = new TenantService();
    await svc.hydrate();
    const h = await svc.persistCreateHospital(`${tag}_医院`, { region: 'east' });
    createdIds.push(h.id);
    const fromDb = await getTenantById(h.id);
    expect(fromDb).not.toBeNull();
    expect(fromDb!.level).toBe('hospital');
    expect(fromDb!.parentId).toBeUndefined();
    expect(fromDb!.config).toEqual({ region: 'east' });
  });

  it('persistCreateCampus 落库并挂在医院下', async () => {
    const svc = new TenantService();
    await svc.hydrate();
    const h = await svc.persistCreateHospital(`${tag}_总院`);
    createdIds.push(h.id);
    const c = await svc.persistCreateCampus(h.id, `${tag}_分院`);
    createdIds.push(c.id);
    const fromDb = await getTenantById(c.id);
    expect(fromDb!.level).toBe('campus');
    expect(fromDb!.parentId).toBe(h.id);
  });

  it('persistSetEnabled 落库：停用后库中 enabled=false', async () => {
    const svc = new TenantService();
    await svc.hydrate();
    const h = await svc.persistCreateHospital(`${tag}_待停用`);
    createdIds.push(h.id);
    await svc.persistSetEnabled(h.id, false);
    const fromDb = await getTenantById(h.id);
    expect(fromDb!.enabled).toBe(false);
  });

  it('persistMergeConfig 落库：浅合并配置', async () => {
    const svc = new TenantService();
    await svc.hydrate();
    const h = await svc.persistCreateHospital(`${tag}_配置`, { a: 1, keep: true });
    createdIds.push(h.id);
    await svc.persistMergeConfig(h.id, { a: 2, b: 'x' });
    const fromDb = await getTenantById(h.id);
    expect(fromDb!.config).toEqual({ a: 2, b: 'x', keep: true });
  });

  it('persistSoftDelete 落库：医院与院区都标记 deletedAt', async () => {
    const svc = new TenantService();
    await svc.hydrate();
    const h = await svc.persistCreateHospital(`${tag}_待删`);
    createdIds.push(h.id);
    const c = await svc.persistCreateCampus(h.id, `${tag}_待删分院`);
    createdIds.push(c.id);
    await svc.persistSoftDelete(h.id);
    const hh = await getTenantById(h.id);
    const cc = await getTenantById(c.id);
    expect(hh!.deletedAt).toBeDefined();
    expect(hh!.enabled).toBe(false);
    expect(cc!.deletedAt).toBeDefined();
  });

  it('默认医院租户受保护：停用/删除都抛错', async () => {
    const svc = new TenantService();
    await svc.hydrate();
    let stopErr: unknown = null;
    let delErr: unknown = null;
    try {
      await svc.persistSetEnabled('demo-hospital', false);
    } catch (e) {
      stopErr = e;
    }
    try {
      await svc.persistSoftDelete('demo-hospital');
    } catch (e) {
      delErr = e;
    }
    expect((stopErr as { code?: string }).code).toBe('DEFAULT_TENANT_PROTECTED');
    expect((delErr as { code?: string }).code).toBe('DEFAULT_TENANT_PROTECTED');
  });

  it('数据库层级约束：医院带 parent 被拒绝', async () => {
    const sql: DbExecutor = getDb();
    let caught: unknown = null;
    try {
      await sql`
        INSERT INTO iam.tenants (id, name, level, parent_id)
        VALUES ('m5a-bad-hospital', ${tag + '_bad'}, 'hospital', 'demo-hospital')
      `;
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
  });

  it('数据库层级约束：院区无 parent 被拒绝', async () => {
    const sql: DbExecutor = getDb();
    let caught: unknown = null;
    try {
      await sql`
        INSERT INTO iam.tenants (id, name, level, parent_id)
        VALUES ('m5a-bad-campus', ${tag + '_badcampus'}, 'campus', NULL)
      `;
    } catch (e) {
      caught = e;
    }
    expect(caught).not.toBeNull();
  });

  it('重启模拟：全新服务 hydrate 后读到此前持久化的节点', async () => {
    // 用一个服务持久化一个节点
    const writer = new TenantService();
    await writer.hydrate();
    const h = await writer.persistCreateHospital(`${tag}_持久`);
    createdIds.push(h.id);
    // 全新服务（模拟进程重启），hydrate 后应能读到
    const reader = new TenantService();
    await reader.hydrate();
    const loaded = reader.get(h.id);
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe(`${tag}_持久`);
  });

  it('BFF 路由：非 admin 调租户树 → 403', async () => {
    const route = tenantAdminRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/admin/tenants/tree',
    )!;
    const res = await route.handle({
      user: { id: doctor.id, roles: doctor.rawRoles, username: doctor.username },
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(403);
  });

  it('BFF 路由：未认证调租户树 → 401', async () => {
    const route = tenantAdminRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/admin/tenants/tree',
    )!;
    const res = await route.handle({
      user: null,
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(401);
  });
});
