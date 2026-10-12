/**
 * 健澜科技 jlmedaios - M36-A Barthel<40 自动康复工单集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { needsRehabTherapy } from '../../src/medical-tools/nursing/rehabAlert.js';
import { recordBarthelView, BarthelError } from '../../src/bff/aggregators/barthelAggregator.js';

describe('纯函数', () => {
  it('needsRehabTherapy', () => {
    expect(needsRehabTherapy(30)).toBe(true);
    expect(needsRehabTherapy(50)).toBe(false);
    expect(needsRehabTherapy(100)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
let stranger: AuthView;
const TAG = 'M36A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '康复科') {
  const patient = await createPatient({
    mrn: `M36A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1970-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'rehab' });
  return { patient, visit };
}

const LOW = { feeding: 5, bathing: 0, grooming: 0, dressing: 5, bowel: 5, bladder: 5, toileting: 5, transfer: 5, walking: 0, stairs: 0 }; // 30
const HIGH = { feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10 }; // 100

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const load = async (u: string) => {
    const user = await getUserByUsername(u);
    if (!user) throw new Error(`缺 ${u}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin'); stranger = await load('doctor_lin');
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE source='rehab' AND visit_id IN (
      SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON v.patient_id=p.id WHERE p.tags @> '["M36A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.barthel_assessments a USING clinical.visits v, clinical.patients p
      WHERE a.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M36A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M36A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M36A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('康复工单（真实 PG）', () => {
  it('total<40 自动建 source=rehab 工单', async () => {
    const { visit } = await newPV();
    const r = await recordBarthelView(admin, { visitId: visit.id, ...LOW });
    expect(r.totalScore).toBe(30);
    expect(r.interventionTaskId).toBeTruthy();
  });
  it('>=40 不建', async () => {
    const { visit } = await newPV();
    const r = await recordBarthelView(admin, { visitId: visit.id, ...HIGH });
    expect(r.interventionTaskId).toBeNull();
  });
  it('幂等：同 visit 重复低评分不重复建', async () => {
    const { visit } = await newPV();
    const r1 = await recordBarthelView(admin, { visitId: visit.id, ...LOW });
    const r2 = await recordBarthelView(admin, { visitId: visit.id, ...LOW });
    expect(r1.interventionTaskId).toBeTruthy();
    expect(r2.interventionTaskId).toBeNull();
  });
  it('越权 403', async () => {
    const { visit } = await newPV('骨科');
    let status = 200;
    try { await recordBarthelView(stranger, { visitId: visit.id, ...LOW }); }
    catch (e) { if (e instanceof BarthelError) status = e.status; }
    expect(status).toBe(403);
  });
});
