/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 集成测试（M18-A）
 *
 * 真实 PG：过敏 hard 无 override 422 / 带 override 200 / 重复 warn 落库 / 越权403 / override 审计。
 * afterAll 仅删 M18A_TEST 标签夹具。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  evaluateCdsView,
  listByVisitView,
  OrderCdsError,
  overrideAlertView,
} from '../../src/bff/aggregators/orderCdsAggregator.js';

let dbAvailable = false;
let admin: AuthView;
let nurse: AuthView;

const TAG = 'M18A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit() {
  const patient = await createPatient({
    mrn: `M18A${seq()}`, nameMasked: `M*${seq().slice(-4)}`,
    gender: '男', birthDate: '1970-01-01', tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '心血管内科', chiefComplaint: 'CDS测试',
  });
  return { patient, visit };
}

async function statusOf(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) {
    if (e instanceof OrderCdsError) return e.status;
    throw e;
  }
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string): Promise<AuthView> => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺账号 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  nurse = await load('nurse_ma');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.order_cds_alerts a USING clinical.visits v, clinical.patients p
      WHERE a.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M18A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M18A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M18A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const describeReal = dbAvailable ? describe : describe.skip;

describeReal('医嘱开方 CDS（真实 PostgreSQL）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('cds:override');
    expect(nurse.permissions).toContain('cds:read');
  });

  it('过敏 hard 无 override -> 422', async () => {
    const { visit } = await newPatientVisit();
    const s = await statusOf(evaluateCdsView(admin, {
      orderId: '11111111-1111-1111-1111-111111111111', visitId: visit.id,
      order: { drugName: 'paracetamol', doseMg: 500, frequencyPerDay: 4 },
      allergies: ['paracetamol'],
    }));
    expect(s).toBe(422);
  });

  it('过敏 hard 带 override_reason -> 放行 200', async () => {
    const { visit } = await newPatientVisit();
    const r = await evaluateCdsView(admin, {
      orderId: '22222222-2222-2222-2222-222222222222', visitId: visit.id,
      order: { drugName: 'paracetamol', doseMg: 500, frequencyPerDay: 4 },
      allergies: ['paracetamol'], overrideReason: 'benefit outweighs risk',
    });
    expect(r.overridden).toBe(true);
    expect(r.alerts.length).toBeGreaterThan(0);
  });

  it('重复医嘱 warn 落库（非 hard，直接放行）', async () => {
    const { visit } = await newPatientVisit();
    const r = await evaluateCdsView(admin, {
      orderId: '33333333-3333-3333-3333-333333333333', visitId: visit.id,
      order: { drugName: 'amoxicillin', doseMg: 500, frequencyPerDay: 3 },
      activeOrders: [{ drugName: 'amoxicillin', status: 'active' }],
    });
    expect(r.alerts.some((a) => a.ruleCode === 'duplicate_active_order')).toBe(true);
  });

  it('override 审计可查', async () => {
    const { visit } = await newPatientVisit();
    const r = await evaluateCdsView(admin, {
      orderId: '44444444-4444-4444-4444-444444444444', visitId: visit.id,
      order: { drugName: 'paracetamol', doseMg: 500, frequencyPerDay: 4 },
      allergies: ['paracetamol'], overrideReason: 'clinical decision',
    });
    const hard = r.alerts.find((a) => a.severity === 'hard');
    expect(hard).toBeTruthy();
    if (hard) {
      const ov = await overrideAlertView(admin, hard.id, 'documented override');
      expect(ov?.overrideReason).toBe('documented override');
    }
  });

  it('越权 403（nurse_ma 跨科）', async () => {
    const { visit } = await newPatientVisit();
    const s = await statusOf(evaluateCdsView(nurse, {
      orderId: '55555555-5555-5555-5555-555555555555', visitId: visit.id,
      order: { drugName: 'x', doseMg: 1, frequencyPerDay: 1 },
    }));
    expect(s).toBe(403);
  });
});
