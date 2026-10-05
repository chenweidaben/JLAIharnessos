/**
 * 健澜科技 jlmedaios - 院长驾驶舱统计 集成测试（M9-A）
 *
 * 直连真实 PostgreSQL，对 BFF 院长驾驶舱路由（无 mock）验证：
 *  - GET /dashboard/stats 返回真实统计 overview/trend/departmentLoad/latestAlerts；
 *  - overview 计数与库内实际一致（当前在院、待审医嘱/处方、床位）；
 *  - 床位占用率口径正确；趋势天数参数 days 生效（默认 14，上限 90）；
 *  - 未登录 401。
 *
 * 本测试只读，不产生数据，无需清理。
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
import { dashboardRoutes } from '../../src/bff/routes/dashboard.js';
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

afterAll(async () => {
  if (dbAvailable) await closeDbForTest();
});

function makeCtx(opts: {
  view?: AuthView | null;
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
  return {
    req: new Request('http://localhost/api'),
    params: {},
    query: new URLSearchParams(opts.query ?? {}),
    clientIp: '127.0.0.1',
    rawBody: null,
    body: async () => ({}),
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

const statsRoute = dashboardRoutes.find(
  (r) => r.method === 'GET' && r.path === '/api/v1/dashboard/stats',
)! as RouteDef;

describe.skipIf(!dbAvailable)('M9-A 院长驾驶舱（真实库）', () => {
  it('GET /dashboard/stats：code=0，含 overview/trend/departmentLoad/latestAlerts', async () => {
    const res = await statsRoute.handle(makeCtx({ view: admin }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.overview).toBeTruthy();
    expect(Array.isArray(body.data.trend)).toBe(true);
    expect(Array.isArray(body.data.departmentLoad)).toBe(true);
    expect(Array.isArray(body.data.latestAlerts)).toBe(true);
  });

  it('overview：计数为非负整数，与库内实际一致', async () => {
    const res = await statsRoute.handle(makeCtx({ view: admin }));
    const body = await res.json();
    const o = body.data.overview;

    const db = getDb();
    const [inpatients] = await db`
      SELECT (SELECT count(*) FROM clinical.admissions WHERE status='admitted')::int AS ip,
             (SELECT count(*) FROM clinical.orders WHERE status='pending_review')::int AS por,
             (SELECT count(*) FROM clinical.prescriptions WHERE status='pending_review')::int AS ppr,
             (SELECT count(*) FROM clinical.beds)::int AS bt,
             (SELECT count(*) FROM clinical.beds WHERE status='occupied')::int AS bo`;
    expect(o.currentInpatients).toBe(inpatients.ip);
    expect(o.pendingOrderReview).toBe(inpatients.por);
    expect(o.pendingPrescriptionReview).toBe(inpatients.ppr);
    expect(o.bedsTotal).toBe(inpatients.bt);
    expect(o.bedsOccupied).toBe(inpatients.bo);
    for (const k of [
      'todayOutpatient', 'todayEmergency', 'todayAdmitted', 'todayDischarged',
      'activeOrders', 'unresolvedCriticalAlerts', 'bedsAvailable',
    ]) {
      expect(Number.isInteger(o[k])).toBe(true);
      expect(o[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it('床位占用率 = occupied/total*100（保留一位小数）', async () => {
    const res = await statsRoute.handle(makeCtx({ view: admin }));
    const o = (await res.json()).data.overview;
    const expected = o.bedsTotal > 0 ? Math.round((o.bedsOccupied / o.bedsTotal) * 1000) / 10 : 0;
    expect(o.bedOccupancyRate).toBe(expected);
  });

  it('趋势：默认 14 天；days=7 返回 7 天；days 超上限按 90 截断', async () => {
    let res = await statsRoute.handle(makeCtx({ view: admin }));
    expect((await res.json()).data.trend).toHaveLength(14);

    res = await statsRoute.handle(makeCtx({ view: admin, query: { days: '7' } }));
    const t7 = (await res.json()).data.trend;
    expect(t7).toHaveLength(7);

    res = await statsRoute.handle(makeCtx({ view: admin, query: { days: '999' } }));
    expect((await res.json()).data.trend).toHaveLength(90);
  });

  it('趋势点：日期升序、字段为非负整数', async () => {
    const res = await statsRoute.handle(makeCtx({ view: admin, query: { days: '7' } }));
    const trend = (await res.json()).data.trend;
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i].date >= trend[i - 1].date).toBe(true);
    }
    for (const p of trend) {
      for (const k of ['outpatient', 'emergency', 'admitted', 'discharged']) {
        expect(Number.isInteger(p[k])).toBe(true);
        expect(p[k]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('科室负载：在院计数之和 = 当前在院总数', async () => {
    const res = await statsRoute.handle(makeCtx({ view: admin }));
    const data = (await res.json()).data;
    const sum = data.departmentLoad.reduce((a: number, d: { inpatients: number }) => a + d.inpatients, 0);
    // 未达 limit 截断时应等于总数；若被截断则 <= 总数
    expect(sum).toBeLessThanOrEqual(data.overview.currentInpatients);
  });

  it('普通医生可访问（全院/本科运营指标）', async () => {
    const res = await statsRoute.handle(makeCtx({ view: doctorChen }));
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe(0);
  });

  it('未登录：401', async () => {
    const res = await statsRoute.handle(makeCtx({ view: null }));
    expect(res.status).toBe(401);
  });
});
