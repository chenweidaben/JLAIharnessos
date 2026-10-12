/**
 * 健澜科技 jlmedaios - M33-B ICU 镇静异常自动工单集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { needsAdjustment, sedationTaskTitle } from '../../src/medical-tools/nursing/icuSedationAlert.js';
import { recordSedationView } from '../../src/bff/aggregators/icuSedationAggregator.js';

describe('纯函数', () => {
  it('触发调整', () => {
    expect(needsAdjustment(-4)).toBe(true);
    expect(needsAdjustment(3)).toBe(true);
    expect(needsAdjustment(0)).toBe(false);
    expect(sedationTaskTitle(-4)).toContain('-4');
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M33B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = 'ICU') {
  const patient = await createPatient({
    mrn: `M33B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1955-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'icu' });
  return { patient, visit };
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='icu_sedation' AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M33B_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.icu_sedation_records r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M33B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M33B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M33B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('镇静异常工单（真实 PG）', () => {
  it('RASS=-4 自动建 source=icu_sedation 工单', async () => {
    const { visit } = await newPV();
    const r = await recordSedationView(admin, { visitId: visit.id, rassScore: -4 });
    expect(r.interventionTaskId).toBeTruthy();
  });
  it('RASS=+3 躁动也建', async () => {
    const { visit } = await newPV();
    const r = await recordSedationView(admin, { visitId: visit.id, rassScore: 3 });
    expect(r.interventionTaskId).toBeTruthy();
  });
  it('RASS=0 目标内不建', async () => {
    const { visit } = await newPV();
    const r = await recordSedationView(admin, { visitId: visit.id, rassScore: 0 });
    expect(r.interventionTaskId).toBeNull();
  });
  it('幂等：同 visit 再次异常不重复建', async () => {
    const { visit } = await newPV();
    const r1 = await recordSedationView(admin, { visitId: visit.id, rassScore: -4 });
    const r2 = await recordSedationView(admin, { visitId: visit.id, rassScore: -5 });
    expect(r1.interventionTaskId).toBeTruthy();
    expect(r2.interventionTaskId).toBeNull();
  });
});
