/**
 * 健澜科技 jlmedaios - M34-B 产后异常工单 + 屏聚合集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { needsReferral } from '../../src/medical-tools/nursing/postpartumAlert.js';
import { recordPostpartumView } from '../../src/bff/aggregators/postpartumVisitAggregator.js';
import { getVisitEvaluations } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';

describe('纯函数', () => {
  it('needsReferral', () => {
    expect(needsReferral(1, 8, 2)).toBe(true);
    expect(needsReferral(1, 4, 1)).toBe(true);
    expect(needsReferral(1, 4, 3)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M34B_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '产科') {
  const patient = await createPatient({
    mrn: `M34B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '女',
    birthDate: '1990-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'postpartum' });
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
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='postpartum' AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M34B_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.postpartum_visits r USING clinical.visits v, clinical.patients p
      WHERE r.mother_visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M34B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M34B_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M34B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('产后工单（真实 PG）', () => {
  it('黄疸 elevated 自动建 source=postpartum 工单', async () => {
    const { visit } = await newPV();
    const r = await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 1, breastfeedingScore: 3, jaundiceTcb: 10 });
    expect(r.interventionTaskId).toBeTruthy();
  });
  it('喂养不足也建；正常不建', async () => {
    const { visit: v1 } = await newPV();
    const r1 = await recordPostpartumView(admin, { motherVisitId: v1.id, postpartumDay: 1, breastfeedingScore: 0, jaundiceTcb: 4 });
    expect(r1.interventionTaskId).toBeTruthy();
    const { visit: v2 } = await newPV();
    const r2 = await recordPostpartumView(admin, { motherVisitId: v2.id, postpartumDay: 1, breastfeedingScore: 3, jaundiceTcb: 4 });
    expect(r2.interventionTaskId).toBeNull();
  });
  it('幂等：同 mother_visit 重复异常不重复建', async () => {
    const { visit } = await newPV();
    const r1 = await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 1, breastfeedingScore: 0 });
    const r2 = await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 2, breastfeedingScore: 0 });
    expect(r1.interventionTaskId).toBeTruthy();
    expect(r2.interventionTaskId).toBeNull();
  });
  it('evaluations 返回 icu+postpartum 块', async () => {
    const { visit } = await newPV();
    await recordPostpartumView(admin, { motherVisitId: visit.id, postpartumDay: 1, breastfeedingScore: 3, jaundiceTcb: 4 });
    const out = await getVisitEvaluations(admin, visit.id);
    expect(out.summary.icu).toBeTruthy();
    expect(out.summary.postpartum).toBeTruthy();
  });
});
