/**
 * 健澜科技 jlmedaios - 给药三查七对 MAR 集成测试（M17-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 正常给药 200（五对全过、普通药）；
 *  - 高危药缺双人核对 409；双人核对=执行人 409；
 *  - CDS 拦截无 override 理由 400；五对未过无 override 400；
 *  - 越权 403（无 med_admin:read 的角色）；未登录 401；记录不存在 404；
 *  - 幂等重放同 idempotency_key 409；NQI_MED_ERROR 分母分子。
 *
 * 需要可用 PostgreSQL（TEST_REAL=1）；无 DB 自动跳过。
 * afterAll 仅删除 M17B_TEST 标签夹具，绝不全表删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  executeMed,
  listMedAdminsView,
  getMedErrorMetrics,
  MedAdminError,
} from '../../src/bff/aggregators/medAdminAggregator.js';
import { medAdminRoutes } from '../../src/bff/routes/medAdmin.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let nurse: AuthView;

const TAG = 'M17B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M17B${seq()}`,
    nameMasked: `M*${seq().slice(-4)}`,
    gender: '女',
    birthDate: '1970-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: dept,
    chiefComplaint: '给药三查七对测试',
  });
  return { patient, visit };
}

function makeCtx(user: { id: string; roles?: string[] } | null): Ctx {
  return {
    user: user ? { ...user, roles: user.roles ?? ['admin'], permissions: [] } : null,
    query: new URLSearchParams(),
    params: {} as Record<string, string>,
    body: async () => ({}),
    headers: new Headers(),
    method: 'GET',
    path: '/',
  } as unknown as Ctx;
}

/** 手动捕获聚合器抛出的 MedAdminError（避免 bun .rejects 在本机挂起）。 */
async function statusOf(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    if (e instanceof MedAdminError) return e.status;
    throw e;
  }
}

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
  doctorChen = await load('doctor_chen');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.med_administrations m
      USING clinical.visits v, clinical.patients p
      WHERE m.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17B_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M17B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M17B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const describeReal = dbAvailable ? describe : describe.skip;

describeReal('给药三查七对 MAR（真实 PostgreSQL）', () => {
  it('环境就绪：账号权限分离', () => {
    expect(admin.permissions).toContain('med_admin:execute');
    expect(nurse.permissions).toContain('med_admin:execute');
    expect(doctorChen.permissions).not.toContain('med_admin:execute');
  });

  it('正常给药 200：普通药五对全过', async () => {
    const { patient, visit } = await newPatientVisit();
    const r = await executeMed(admin, {
      orderId: '11111111-1111-1111-1111-111111111111',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '维生素C片',
      dose: '0.1g',
      signature: 'AdminSign',
      withinTimeWindow: true,
      notExpired: true,
      idempotencyKey: `mar-ok-${seq()}`,
    });
    expect(r.administration.status).toBe('given');
    expect(r.highRisk).toBe(false);
    expect(r.checks.every((c) => c.ok)).toBe(true);
  });

  it('高危药缺双人核对 => 409', async () => {
    const { patient, visit } = await newPatientVisit();
    const st = await statusOf(executeMed(admin, {
      orderId: '22222222-2222-2222-2222-222222222222',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '盐酸吗啡注射液',
      dose: '10mg',
      signature: 'AdminSign',
      idempotencyKey: `mar-nodc-${seq()}`,
    }));
    expect(st).toBe(409);
  });

  it('高危药双人核对=执行人 => 409', async () => {
    const { patient, visit } = await newPatientVisit();
    const st = await statusOf(executeMed(admin, {
      orderId: '33333333-3333-3333-3333-333333333333',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '胰岛素注射液',
      dose: '6IU',
      doubleCheckBy: admin.id,
      signature: 'AdminSign',
      idempotencyKey: `mar-selfdc-${seq()}`,
    }));
    expect(st).toBe(409);
  });

  it('CDS 拦截无 override 理由 => 400', async () => {
    const { patient, visit } = await newPatientVisit();
    const st = await statusOf(executeMed(admin, {
      orderId: '44444444-4444-4444-4444-444444444444',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '维生素C片',
      dose: '0.1g',
      cdsBlocked: true,
      signature: 'AdminSign',
      idempotencyKey: `mar-cds-${seq()}`,
    }));
    expect(st).toBe(400);
  });

  it('五对患者不符且无 override => 400', async () => {
    const { visit } = await newPatientVisit();
    const st = await statusOf(executeMed(admin, {
      orderId: '55555555-5555-5555-5555-555555555555',
      visitId: visit.id,
      wristbandPatientId: '00000000-0000-0000-0000-000000000000',
      medName: '维生素C片',
      dose: '0.1g',
      signature: 'AdminSign',
      idempotencyKey: `mar-wrongpt-${seq()}`,
    }));
    expect(st).toBe(400);
  });

  it('幂等重放同 idempotency_key => 409', async () => {
    const { patient, visit } = await newPatientVisit();
    const key = `mar-idem-${seq()}`;
    await executeMed(admin, {
      orderId: '66666666-6666-6666-6666-666666666666',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '维生素C片',
      dose: '0.1g',
      signature: 'AdminSign',
      idempotencyKey: key,
    });
    const st = await statusOf(executeMed(admin, {
      orderId: '66666666-6666-6666-6666-666666666666',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '维生素C片',
      dose: '0.1g',
      signature: 'AdminSign',
      idempotencyKey: key,
    }));
    expect(st).toBe(409);
  });

  it('无 execute 权限角色 => 403', async () => {
    const { patient, visit } = await newPatientVisit();
    const st = await statusOf(executeMed(doctorChen, {
      orderId: '77777777-7777-7777-7777-777777777777',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '维生素C片',
      dose: '0.1g',
      signature: 'DocSign',
      idempotencyKey: `mar-403-${seq()}`,
    }));
    expect(st).toBe(403);
  });

  it('NQI_MED_ERROR：分母=given 数，分子=差错类数', async () => {
    const { patient, visit } = await newPatientVisit();
    await executeMed(admin, {
      orderId: '88888888-8888-8888-8888-888888888888',
      visitId: visit.id,
      wristbandPatientId: patient.id,
      medName: '维生素C片',
      dose: '0.1g',
      signature: 'AdminSign',
      errorType: 'wrong_patient',
      idempotencyKey: `mar-err-${seq()}`,
    });
    const m = await getMedErrorMetrics(admin);
    expect(m.metrics.fractions.medErrorRate.denominator).toBeGreaterThan(0);
    expect(m.metrics.fractions.medErrorRate.numerator).toBeGreaterThan(0);
  });

  it('路由：未登录 401；记录不存在 404', async () => {
    const listRoute = medAdminRoutes.find((r) => r.path === '/api/v1/medication-admin' && r.method === 'GET')!;
    const r401 = await listRoute.handle(makeCtx(null));
    expect(r401.status).toBe(401);

    const detailRoute = medAdminRoutes.find((r) => r.path === '/api/v1/medication-admin/:id')!;
    const detailCtx = Object.assign(makeCtx({ id: admin.id }), {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });
    const r404 = await detailRoute.handle(detailCtx);
    expect(r404.status).toBe(404);
  });
});
