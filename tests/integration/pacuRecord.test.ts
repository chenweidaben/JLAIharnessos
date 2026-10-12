/**
 * 健澜科技 jlmedaios - M31-B PACU 记录集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { aldreteTotal, delayedRecovery, readyForDischarge } from '../../src/medical-tools/nursing/pacuRecord.js';
import { recordPacuView, listPacuView, PacuError } from '../../src/bff/aggregators/pacuRecordAggregator.js';

describe('纯函数', () => {
  it('Aldrete 总分', () => {
    expect(aldreteTotal(2,2,2,2,2)).toBe(10);
    expect(aldreteTotal(2,2,2,1,1)).toBe(8);
  });
  it('>=9 可出室', () => {
    expect(readyForDischarge(8)).toBe(false);
    expect(readyForDischarge(9)).toBe(true);
  });
  it('苏醒延迟', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 70*60000);
    expect(delayedRecovery(old, now, 6)).toBe(true);
    expect(delayedRecovery(old, now, 9)).toBe(false);
  });
});

let dbAvailable = false;
let nurse: AuthView;
const TAG = 'M31B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M31B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '女',
    birthDate: '1970-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'pacu' });
  return { patient, visit };
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) nurse = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.pacu_records r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M31B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M31B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M31B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('PACU（真实 PG）', () => {
  it('权限', () => {
    expect(nurse.permissions).toContain('pacu:record');
  });
  it('>=9 ready / <9 不可出室', async () => {
    const { visit } = await newPV();
    const ready = await recordPacuView(nurse, { visitId: visit.id, activity: 2, respiration: 2, circulation: 2, consciousness: 2, spo2: 2 });
    expect(ready.aldrete).toBe(10);
    expect(ready.ready).toBe(true);
    const low = await recordPacuView(nurse, { visitId: visit.id, activity: 1, respiration: 1, circulation: 1, consciousness: 1, spo2: 1 });
    expect(low.ready).toBe(false);
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await recordPacuView(nurse, { visitId: visit.id, activity: 2, respiration: 2, circulation: 2, consciousness: 2, spo2: 2 });
    const list = await listPacuView(nurse, visit.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});
