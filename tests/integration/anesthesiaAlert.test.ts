/**
 * 健澜科技 jlmedaios - M31-D 麻醉告警自动工单集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { preopMissingItems, shouldCreatePacuTask, shouldCreatePreopTask } from '../../src/medical-tools/nursing/anesthesiaAlert.js';
import { createPreopView } from '../../src/bff/aggregators/preopAssessmentAggregator.js';
import { recordPacuView } from '../../src/bff/aggregators/pacuRecordAggregator.js';

describe('纯函数', () => {
  it('术前缺失项', () => {
    expect(preopMissingItems(true, false, false)).toEqual(['allergy', 'consent']);
    expect(shouldCreatePreopTask(true, true, true)).toBe(false);
  });
  it('PACU 苏醒延迟', () => {
    expect(shouldCreatePacuTask(true)).toBe(true);
    expect(shouldCreatePacuTask(false)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M31D_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M31D${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1960-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'anesthesia' });
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
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='anesthesia' AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M31D_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.preop_assessments r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M31D_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.pacu_records r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M31D_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M31D_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M31D_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('麻醉告警工单（真实 PG）', () => {
  it('术前三项缺失自动建 source=anesthesia 工单；齐全不建', async () => {
    const { visit } = await newPV();
    const partial = await createPreopView(admin, { visitId: visit.id, asaGrade: 'II', npoConfirmed: true, allergyChecked: false, consentSigned: false });
    expect(partial.interventionTaskId).toBeTruthy();
    const full = await createPreopView(admin, { visitId: visit.id, asaGrade: 'I', npoConfirmed: true, allergyChecked: true, consentSigned: true });
    expect(full.interventionTaskId).toBeNull();
  });
  it('PACU Aldrete 低（不可出室）自动建工单', async () => {
    const { visit } = await newPV();
    const low = await recordPacuView(admin, { visitId: visit.id, activity: 1, respiration: 1, circulation: 1, consciousness: 1, spo2: 1 });
    expect(low.ready).toBe(false);
    expect(low.interventionTaskId).toBeTruthy();
  });
  it('PACU Aldrete 满分不建工单', async () => {
    const { visit } = await newPV();
    const high = await recordPacuView(admin, { visitId: visit.id, activity: 2, respiration: 2, circulation: 2, consciousness: 2, spo2: 2 });
    expect(high.ready).toBe(true);
    expect(high.interventionTaskId).toBeNull();
  });
});
