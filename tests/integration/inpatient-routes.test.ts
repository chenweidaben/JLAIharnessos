/**
 * 健澜科技 jlmedaios - 住院路由层测试（M1-A）
 *
 * 用最小 fake Ctx（与 middleware/auth.newCtx 同构）驱动 src/bff/routes/inpatient.ts，
 * 聚合器与数据库为真实实现（无 DB 自动跳过），覆盖：
 *  - 正常路径 render()：床位图/列表/入院/详情/换床/转科/出院/床位维护；
 *  - 异常路径 mapError()：400/404 统一错误信封；
 *  - 权限门禁：护士缺 inpatient:discharge → 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { inpatientRoutes } from '../../src/bff/routes/inpatient.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  closeDbForTest,
  verifyDbConnection,
} from '../../src/db/pool.js';
import { getWardByCode } from '../../src/db/repositories/wardRepo.js';
import { listBedsByWard } from '../../src/db/repositories/bedRepo.js';
import { discharge } from '../../src/bff/aggregators/inpatientAggregator.js';
import type { Ward } from '../../src/db/repositories/wardRepo.js';

let dbAvailable = false;
let adminView: AuthView;
let adminUser: { id: string; roles: string[]; permissions: string[] };
let nurseUser: { id: string; roles: string[]; permissions: string[] };
let cardio: Ward;
let resp: Ward;
const tracked: string[] = [];
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** 与 newCtx 同构的最小 fake Ctx */
function makeCtx(user: any, body: any = {}, params: any = {}): any {
  return {
    req: {},
    params,
    query: new URLSearchParams(),
    body: async () => body,
    user,
    traceId: 'trace-test',
  };
}

function route(fullPath: string): any {
  return inpatientRoutes.find((r) => r.path === fullPath);
}

async function call(fullPath: string, user: any, body?: any, params?: any) {
  const res: Response = await route(fullPath).handle(makeCtx(user, body, params));
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

beforeAll(async () => {
  try {
    await verifyDbConnection(2, 1000);
    dbAvailable = true;
    const loadView = async (u: string) => {
      const us = await getUserByUsername(u);
      return buildAuthView(us!, await getUserRoleLinks(us!.id));
    };
    adminView = await loadView('admin');
    const nurseView = await loadView('nurse_zhao');
    adminUser = {
      id: adminView.id,
      roles: ['admin'],
      permissions: adminView.permissions,
    };
    nurseUser = {
      id: nurseView.id,
      roles: ['nurse'],
      permissions: nurseView.permissions,
    };
    cardio = (await getWardByCode('WARD-CARDIO-1'))!;
    resp = (await getWardByCode('WARD-RESP-1'))!;
  } catch {
    dbAvailable = false;
  }
});

afterEach(async () => {
  if (!dbAvailable) return;
  for (const v of tracked.splice(0)) {
    try {
      await discharge(adminView, { visitId: v });
    } catch {
      /* ignore */
    }
  }
});

afterAll(async () => {
  if (dbAvailable) await closeDbForTest();
});

const skip = () => !dbAvailable;

describe('住院路由 - 正常路径', () => {
  it('GET bed-map → 200', async () => {
    if (skip()) return;
    const r = await call('/api/v1/inpatient/bed-map', adminUser);
    expect(r.status).toBe(200);
    expect(r.json.data.wards.length).toBeGreaterThan(0);
  });

  it('GET patients → 200', async () => {
    if (skip()) return;
    const r = await call('/api/v1/inpatient/patients', adminUser);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.data.items)).toBe(true);
  });

  it('入院→详情→换床→转科→出院 全生命周期 200', async () => {
    if (skip()) return;
    let r = await call('/api/v1/inpatient/admissions', adminUser, {
      newPatient: { nameMasked: `路由*${seq().slice(-4)}`, gender: '未知', tags: ['ROUTE'] },
      wardId: cardio.id,
      diagnosis: '路由测试（虚构）',
      condition: 'stable',
      admissionType: 'elective',
      source: 'other',
    });
    expect(r.status).toBe(200);
    const item = r.json.data;
    tracked.push(item.visitId);

    r = await call('/api/v1/inpatient/patients/:visitId', adminUser, undefined, {
      visitId: item.visitId,
    });
    expect(r.status).toBe(200);
    expect(r.json.data.movements.length).toBeGreaterThan(0);

    const target = (await listBedsByWard(cardio.id)).find(
      (b) => b.status === 'available' && b.id !== item.bedId,
    );
    r = await call(
      '/api/v1/inpatient/patients/:visitId/bed-change',
      adminUser,
      { targetBedId: target!.id, reason: '路由换床' },
      { visitId: item.visitId },
    );
    expect(r.status).toBe(200);

    r = await call(
      '/api/v1/inpatient/patients/:visitId/transfer',
      adminUser,
      { targetWardId: resp.id, reason: '路由转科' },
      { visitId: item.visitId },
    );
    expect(r.status).toBe(200);

    // 床位维护：toggle 一张呼吸空闲床再恢复
    const free = (await listBedsByWard(resp.id)).find((b) => b.status === 'available');
    r = await call('/api/v1/inpatient/beds/:bedId/status', adminUser, {
      status: 'maintenance',
      reason: '路由维护',
    }, { bedId: free!.id });
    expect(r.status).toBe(200);
    r = await call('/api/v1/inpatient/beds/:bedId/status', adminUser, {
      status: 'available',
    }, { bedId: free!.id });
    expect(r.status).toBe(200);

    r = await call(
      '/api/v1/inpatient/patients/:visitId/discharge',
      adminUser,
      { reason: '路由出院' },
      { visitId: item.visitId },
    );
    expect(r.status).toBe(200);
    expect(r.json.data.movements).toBeUndefined();
    tracked.splice(tracked.indexOf(item.visitId), 1);
  });
});

describe('住院路由 - 异常路径 mapError', () => {
  it('入院诊断为空 → 400', async () => {
    if (skip()) return;
    const r = await call('/api/v1/inpatient/admissions', adminUser, {
      newPatient: { nameMasked: 'x', gender: '未知' },
      wardId: cardio.id,
      diagnosis: '',
      condition: 'stable',
      admissionType: 'elective',
      source: 'other',
    });
    expect(r.status).toBe(400);
  });

  it('详情不存在 → 404', async () => {
    if (skip()) return;
    const r = await call(
      '/api/v1/inpatient/patients/:visitId',
      adminUser,
      undefined,
      { visitId: '00000000-0000-0000-0000-000000000000' },
    );
    expect(r.status).toBe(404);
  });

  it('换床缺少 targetBedId → 400', async () => {
    if (skip()) return;
    const r = await call(
      '/api/v1/inpatient/patients/:visitId/bed-change',
      adminUser,
      {},
      { visitId: '00000000-0000-0000-0000-000000000000' },
    );
    expect(r.status).toBe(400);
  });

  it('转科缺少 targetWardId → 400', async () => {
    if (skip()) return;
    const r = await call(
      '/api/v1/inpatient/patients/:visitId/transfer',
      adminUser,
      {},
      { visitId: 'x' },
    );
    expect(r.status).toBe(400);
  });

  it('床位维护非法状态 → 400', async () => {
    if (skip()) return;
    const r = await call(
      '/api/v1/inpatient/beds/:bedId/status',
      adminUser,
      { status: 'bogus' },
      { bedId: 'x' },
    );
    expect(r.status).toBe(400);
  });

  it('未登录 user=null → 401', async () => {
    if (skip()) return;
    const r = await call('/api/v1/inpatient/patients', null);
    expect(r.status).toBe(401);
  });
});

describe('住院路由 - 权限门禁', () => {
  it('护士缺 inpatient:discharge，打出院端点 → 403', async () => {
    if (skip()) return;
    // 先由 admin 入院一名患者
    let r = await call('/api/v1/inpatient/admissions', adminUser, {
      newPatient: { nameMasked: `门禁*${seq().slice(-4)}`, gender: '未知' },
      wardId: cardio.id,
      diagnosis: '门禁测试（虚构）',
      condition: 'stable',
      admissionType: 'elective',
      source: 'other',
    });
    const item = r.json.data;
    tracked.push(item.visitId);

    // 护士尝试出院 → 403
    r = await call(
      '/api/v1/inpatient/patients/:visitId/discharge',
      nurseUser,
      { reason: '护士越权出院' },
      { visitId: item.visitId },
    );
    expect(r.status).toBe(403);
    expect(r.json.code).toBe(40300);
  });
});
