/**
 * 健澜科技 jlmedaios - M29-C 营养/疼痛阳性自动工单集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createScreeningView } from '../../src/bff/aggregators/nutritionScreeningAggregator.js';
import { createAssessmentView } from '../../src/bff/aggregators/painAssessmentAggregator.js';
import { listBySource } from '../../src/db/repositories/improvementTaskRepo.js';

let dbAvailable = false;
let nurse: AuthView;
const TAG = 'M29C_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '急诊科') {
  const patient = await createPatient({
    mrn: `M29C${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1940-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'M29C' });
  return { patient, visit };
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('nurse_ma');
  if (u) nurse = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source IN ('nutrition','pain') AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M29C_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.nutrition_screenings r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M29C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.pain_assessments r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M29C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M29C_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M29C_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

const R = dbAvailable ? describe : describe.skip;
R('M29-C 阳性自动工单', () => {
  it('营养 risk=true 自动建 source=nutrition 工单', async () => {
    const { visit } = await newPV();
    const r = await createScreeningView(nurse, { visitId: visit.id, nutritionScore: 2, diseaseSeverity: 1, ageYears: 80 });
    expect(r.nutritionRisk).toBe(true);
    expect(r.interventionTaskId).toBeTruthy();
  });
  it('重复筛查不重复建工单（幂等）', async () => {
    const { visit } = await newPV();
    await createScreeningView(nurse, { visitId: visit.id, nutritionScore: 2, diseaseSeverity: 1, ageYears: 80 });
    const r2 = await createScreeningView(nurse, { visitId: visit.id, nutritionScore: 3, diseaseSeverity: 1, ageYears: 80 });
    expect(r2.interventionTaskId).toBeNull();
  });
  it('疼痛>=4 自动建 source=pain 工单；<4 不建', async () => {
    const { visit } = await newPV();
    const high = await createAssessmentView(nurse, { visitId: visit.id, score: 7, assessType: 'cancer' });
    expect(high.interventionTaskId).toBeTruthy();
    const low = await createAssessmentView(nurse, { visitId: visit.id, score: 2, assessType: 'admission' });
    expect(low.interventionTaskId).toBeNull();
  });
});
