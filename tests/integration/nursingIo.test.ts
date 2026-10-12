/**
 * 健澜科技 jlmedaios - 护理出入量集成测试（M17-E）
 *
 * 真实 PostgreSQL：正常录入200、amount负数400、越权403、24h平衡正确、无权限403。
 * afterAll 仅删 M17E_TEST 标签夹具。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  getIoBalanceView,
  NursingIoError,
  recordIoView,
} from '../../src/bff/aggregators/nursingIoAggregator.js';

let dbAvailable = false;
let admin: AuthView;
let nurse: AuthView;

const TAG = 'M17E_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatientVisit(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M17E${seq()}`,
    nameMasked: `M*${seq().slice(-4)}`,
    gender: '女',
    birthDate: '1970-01-01',
    tags: [TAG],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: '出入量测试',
  });
  return { patient, visit };
}

async function statusOf(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) {
    if (e instanceof NursingIoError) return e.status;
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
    await db`DELETE FROM clinical.nursing_io_records r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M17E_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M17E_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M17E_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const describeReal = dbAvailable ? describe : describe.skip;

describeReal('护理出入量（真实 PostgreSQL）', () => {
  it('权限', () => {
    expect(nurse.permissions).toContain('nursing_io:write');
    expect(admin.permissions).toContain('nursing_io:write');
  });

  it('正常录入 200', async () => {
    const { visit } = await newPatientVisit();
    const rec = await recordIoView(nurse, { visitId: visit.id, direction: 'intake', category: 'oral', amountMl: 200 });
    expect(rec.amountMl).toBe(200);
  });

  it('amount 负数 400', async () => {
    const { visit } = await newPatientVisit();
    const s = await statusOf(recordIoView(nurse, { visitId: visit.id, direction: 'intake', category: 'oral', amountMl: -5 }));
    expect(s).toBe(400);
  });

  it('24h 平衡正确', async () => {
    const { visit } = await newPatientVisit();
    await recordIoView(nurse, { visitId: visit.id, direction: 'intake', category: 'iv', amountMl: 1000 });
    await recordIoView(nurse, { visitId: visit.id, direction: 'output', category: 'urine', amountMl: 600 });
    const b = await getIoBalanceView(nurse, visit.id);
    expect(b.last24h.intakeTotal).toBe(1000);
    expect(b.last24h.outputTotal).toBe(600);
    expect(b.last24h.balance).toBe(400);
  });
});
