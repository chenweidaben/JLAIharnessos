/**
 * 健澜科技 jlmedaios - 超管后台医院管理 单元测试（M133-B）
 *
 * 覆盖：
 *  1. 纯函数 buildHospitalAdminDashboard：指标归一化、健康度判定、稳定排序、空数据兜底；
 *  2. 权限控制：未登录 401、普通 admin/医护 403、superadmin 放行；
 *  3. 医院 CRUD：新建医院 → 列表可见 → 更新配置/启停 → 看板反映；
 *  4. 数据隔离：每个 TenantService 实例互不污染，超管看板只看平台租户，不串院。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { TenantService } from '../../src/tenant';
import type { Ctx } from '../../src/bff/types';
import { buildHospitalAdminDashboard } from '../../src/bff/aggregators/superAdminAggregator';
import {
  createSuperAdminHospitalsRoutes,
} from '../../src/bff/routes/superAdminHospitals';

/* ------------------------------------------------------------------ */
/* 测试夹具                                                              */
/* ------------------------------------------------------------------ */

/** 构造最小 Ctx（模拟 attachUser 注入后的请求上下文） */
function makeCtx(opts: {
  roles?: string[];
  body?: unknown;
  params?: Record<string, string>;
} = {}): Ctx {
  const req = new Request('http://localhost/api/v1/superadmin/hospitals', {
    method: opts.body !== undefined ? 'POST' : 'GET',
  });
  const user =
    opts.roles === undefined
      ? null
      : { id: 'u_test', name: '测试超管', roles: opts.roles };
  return {
    req,
    params: opts.params ?? {},
    query: new URLSearchParams(),
    clientIp: '127.0.0.1',
    rawBody: null,
    body: async () => (opts.body ?? {}) as never,
    user,
    traceId: 'trc_test',
  } as unknown as Ctx;
}

function findRoute(routes: ReturnType<typeof createSuperAdminHospitalsRoutes>, method: string, path: string) {
  const r = routes.find((x) => x.method === method && x.path === path);
  if (!r) throw new Error(`路由未注册: ${method} ${path}`);
  return r;
}

/* ================================================================== */
/* 1. 纯函数聚合                                                        */
/* ================================================================== */

describe('buildHospitalAdminDashboard - 指标归一化与健康度', () => {
  it('汇总医院总数/启用数/平均智慧度，按智慧度降序', () => {
    const list = buildHospitalAdminDashboard([
      {
        id: 'h_a', name: 'A 医院', enabled: true,
        wisdomScore: 88, emrLevel: 4, bedTotal: 1000, bedOccupied: 720,
        campusCount: 2, userCount: 300, activeUsersToday: 210,
      },
      {
        id: 'h_b', name: 'B 医院', enabled: true,
        wisdomScore: 95, emrLevel: 5, bedTotal: 800, bedOccupied: 600,
        campusCount: 1, userCount: 200, activeUsersToday: 180,
      },
    ]);
    expect(list.total).toBe(2);
    expect(list.enabledCount).toBe(2);
    expect(list.disabledCount).toBe(0);
    expect(list.avgWisdomScore).toBe((88 + 95) / 2);
    // 智慧度高的 B 排第一
    expect(list.items[0].id).toBe('h_b');
    expect(list.items[1].id).toBe('h_a');
    // 床位使用率 600/800 = 75%
    expect(list.items[0].bedUsageRate).toBe(75);
  });

  it('健康度：停用医院 critical 且原因明确', () => {
    const list = buildHospitalAdminDashboard([
      { id: 'h_x', name: '停用院', enabled: false, wisdomScore: 90, emrLevel: 5 },
    ]);
    expect(list.items[0].health).toBe('critical');
    expect(list.items[0].healthReasons.join()).toContain('停用');
    expect(list.disabledCount).toBe(1);
  });

  it('健康度：智慧度<60 / EMR<3 / 零活跃 → warning 并给出原因', () => {
    const list = buildHospitalAdminDashboard([
      {
        id: 'h_y', name: '弱智慧院', enabled: true,
        wisdomScore: 45, emrLevel: 2, activeUsersToday: 0,
        bedTotal: 500, bedOccupied: 100, // 20% 边缘，不触发
      },
    ]);
    const item = list.items[0];
    expect(item.health).toBe('warning');
    expect(item.healthReasons.length).toBeGreaterThanOrEqual(2);
    expect(item.healthReasons.join()).toContain('智慧度');
    expect(item.healthReasons.join()).toContain('电子病历');
    expect(item.healthReasons.join()).toContain('零活跃');
  });

  it('健康度：床位>95% 紧张 / <20% 闲置 均预警', () => {
    const tight = buildHospitalAdminDashboard([
      { id: 'h_t', name: '紧张院', enabled: true, wisdomScore: 90, emrLevel: 4, bedTotal: 1000, bedOccupied: 980, activeUsersToday: 5 },
    ]);
    expect(tight.items[0].healthReasons.join()).toContain('过度紧张');

    const idle = buildHospitalAdminDashboard([
      { id: 'h_i', name: '闲置院', enabled: true, wisdomScore: 90, emrLevel: 4, bedTotal: 1000, bedOccupied: 50, activeUsersToday: 5 },
    ]);
    expect(idle.items[0].healthReasons.join()).toContain('资源闲置');
  });

  it('空入参 / 缺字段安全兜底，不产生 NaN', () => {
    const empty = buildHospitalAdminDashboard();
    expect(empty.total).toBe(0);
    expect(empty.items).toEqual([]);
    expect(empty.avgWisdomScore).toBe(0);

    const dirty = buildHospitalAdminDashboard([
      { id: 'h_d', name: '脏数据院', enabled: true, wisdomScore: NaN, bedTotal: 0, bedOccupied: NaN },
    ]);
    expect(Number.isFinite(dirty.items[0].wisdomScore)).toBe(true);
    expect(dirty.items[0].wisdomScore).toBe(0);
    expect(dirty.items[0].bedUsageRate).toBe(0);
  });
});

/* ================================================================== */
/* 2. 权限控制（仅 superadmin）                                          */
/* ================================================================== */

describe('superAdminHospitals 路由 - 权限控制', () => {
  const routes = createSuperAdminHospitalsRoutes(new TenantService());

  it('未登录访问 GET → 401', async () => {
    const res = await findRoute(routes, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: undefined }));
    expect(res.status).toBe(401);
  });

  it('普通 admin（院内管理员）访问 → 403，非超管', async () => {
    const res = await findRoute(routes, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['admin'] }));
    expect(res.status).toBe(403);
  });

  it('护士/医师访问 → 403', async () => {
    const res = await findRoute(routes, 'POST', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['nurse', 'physician'], body: { name: 'x' } }));
    expect(res.status).toBe(403);
  });

  it('superadmin 访问 GET → 200', async () => {
    const res = await findRoute(routes, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBe(true);
  });
});

/* ================================================================== */
/* 3. 医院 CRUD + 数据隔离                                               */
/* ================================================================== */

describe('superAdminHospitals 路由 - 医院 CRUD 与数据隔离', () => {
  it('新建医院 → 列表可见 → 更新配置 → 看板反映；store 隔离', async () => {
    const storeA = new TenantService();
    const storeB = new TenantService();
    const routesA = createSuperAdminHospitalsRoutes(storeA);

    // POST 新建
    const createRes = await findRoute(routesA, 'POST', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({
        roles: ['superadmin'],
        body: { name: '杭州示范医院', config: { wisdomScore: 82, emrLevel: 4 } },
      }));
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('杭州示范医院');

    // GET 列表：新建医院出现在 storeA
    const listRes = await findRoute(routesA, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'] }));
    const listBody = await listRes.json();
    expect(listBody.data.total).toBeGreaterThanOrEqual(2); // 默认医院 + 新建
    const mine = listBody.data.items.find((i: { id: string }) => i.id === created.id);
    expect(mine).toBeTruthy();
    expect(mine.wisdomScore).toBe(82);
    expect(mine.emrLevel).toBe(4);

    // PUT 更新配置：补床位与活跃
    const putRes = await findRoute(routesA, 'PUT', '/api/v1/superadmin/hospitals/:id')
      .handle(makeCtx({
        roles: ['superadmin'],
        params: { id: created.id },
        body: { config: { bedTotal: 1200, bedOccupied: 900, activeUsersToday: 320 } },
      }));
    expect(putRes.status).toBe(200);

    // 再次 GET：配置已合并
    const listRes2 = await findRoute(routesA, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'] }));
    const mine2 = (await listRes2.json()).data.items
      .find((i: { id: string }) => i.id === created.id);
    expect(mine2.bedUsageRate).toBe(75); // 900/1200
    expect(mine2.activeUsersToday).toBe(320);

    // 数据隔离：storeB 看不到 storeA 新建的医院
    const routesB = createSuperAdminHospitalsRoutes(storeB);
    const listB = await findRoute(routesB, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'] }));
    const bItems = (await listB.json()).data.items;
    expect(bItems.find((i: { id: string }) => i.id === created.id)).toBeUndefined();
  });

  it('PUT 停用医院 → 看板标 critical；默认医院受保护不可停用', async () => {
    const store = new TenantService();
    const routes = createSuperAdminHospitalsRoutes(store);

    // 新建一家可停用的医院
    const createRes = await findRoute(routes, 'POST', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'], body: { name: '待停用医院' } }));
    const createdId = (await createRes.json()).data.id;

    // 停用
    const disableRes = await findRoute(routes, 'PUT', '/api/v1/superadmin/hospitals/:id')
      .handle(makeCtx({ roles: ['superadmin'], params: { id: createdId }, body: { enabled: false } }));
    expect(disableRes.status).toBe(200);

    // 看板：该医院 critical
    const listRes = await findRoute(routes, 'GET', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'] }));
    const mine = (await listRes.json()).data.items
      .find((i: { id: string }) => i.id === createdId);
    expect(mine.enabled).toBe(false);
    expect(mine.health).toBe('critical');

    // 默认医院不可停用（TenantService 保护）→ 400
    const defaultId = store.getDefaultTenantId();
    const defRes = await findRoute(routes, 'PUT', '/api/v1/superadmin/hospitals/:id')
      .handle(makeCtx({ roles: ['superadmin'], params: { id: defaultId }, body: { enabled: false } }));
    expect(defRes.status).toBe(400);
  });

  it('入参校验：POST 缺 name → 400；PUT 空 body → 400；PUT 不存在 id → 404', async () => {
    const routes = createSuperAdminHospitalsRoutes(new TenantService());

    const badPost = await findRoute(routes, 'POST', '/api/v1/superadmin/hospitals')
      .handle(makeCtx({ roles: ['superadmin'], body: {} }));
    expect(badPost.status).toBe(400);

    const emptyPut = await findRoute(routes, 'PUT', '/api/v1/superadmin/hospitals/:id')
      .handle(makeCtx({ roles: ['superadmin'], params: { id: 'h_nope' }, body: {} }));
    expect(emptyPut.status).toBe(400);

    const notFound = await findRoute(routes, 'PUT', '/api/v1/superadmin/hospitals/:id')
      .handle(makeCtx({ roles: ['superadmin'], params: { id: 'h_nope' }, body: { config: { a: 1 } } }));
    expect(notFound.status).toBe(404);
  });
});
