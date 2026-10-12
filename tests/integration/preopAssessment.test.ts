/**
 * 健澜科技 jlmedaios - M31-A 术前评估集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { isComplete, isHighRisk, missingItems } from '../../src/medical-tools/nursing/preopAssessment.js';
import { createPreopView, listPreopView, PreopError } from '../../src/bff/aggregators/preopAssessmentAggregator.js';

describe('纯函数', () => {
  it('完整性', () => {
    expect(isComplete(true, true, true)).toBe(true);
    expect(isComplete(true, false, true)).toBe(false);
  });
  it('ASA 高风险', () => {
    expect(isHighRisk('II')).toBe(false);
    expect(isHighRisk('IV')).toBe(true);
  });
  it('缺失项', () => {
    expect(missingItems(true, false, false)).toEqual(['allergy', 'consent']);
  });
});

let dbAvailable = false;
let doctor: AuthView;
let stranger: AuthView;
const TAG = 'M31A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '普外科') {
  const patient = await createPatient({
    mrn: `M31A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1960-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'preop' });
  return { patient, visit };
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string) => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  doctor = await load('admin'); stranger = await load('nurse_ma');
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.preop_assessments r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M31A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M31A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M31A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('术前评估（真实 PG）', () => {
  it('权限', () => {
    expect(doctor.permissions).toContain('preop:assess');
  });
  it('三项缺失不完整；三项齐全完整', async () => {
    const { visit } = await newPV();
    const partial = await createPreopView(doctor, { visitId: visit.id, asaGrade: 'II', npoConfirmed: true, allergyChecked: false, consentSigned: false });
    expect(partial.complete).toBe(false);
    expect(partial.missing).toEqual(['allergy', 'consent']);
    const full = await createPreopView(doctor, { visitId: visit.id, asaGrade: 'I', npoConfirmed: true, allergyChecked: true, consentSigned: true });
    expect(full.complete).toBe(true);
  });
  it('列表', async () => {
    const { visit } = await newPV();
    await createPreopView(doctor, { visitId: visit.id, asaGrade: 'II', npoConfirmed: true, allergyChecked: true, consentSigned: true });
    const list = await listPreopView(doctor, visit.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
  it('越权 403（nurse 无 assess 权限）', async () => {
    const { visit } = await newPV();
    let status = 200;
    try { await createPreopView(stranger, { visitId: visit.id, asaGrade: 'I', npoConfirmed: true, allergyChecked: true, consentSigned: true }); }
    catch (e) { if (e instanceof PreopError) status = e.status; }
    expect(status).toBe(403);
  });
});
