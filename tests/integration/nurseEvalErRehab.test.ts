/**
 * 健澜科技 jlmedaios - M38-A 护士屏扩展急诊/Barthel 块集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { triageView } from '../../src/bff/aggregators/erTriageAggregator.js';
import { recordBarthelView } from '../../src/bff/aggregators/barthelAggregator.js';
import { getVisitEvaluations } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M38A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPV(dept = '急诊') {
  const patient = await createPatient({
    mrn: `M38A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男',
    birthDate: '1980-01-01', tags: [TAG],
  });
  const visit = await createVisit({ patientId: patient.id, visitType: 'inpatient', department: dept, chiefComplaint: 'er' });
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
    await db`DELETE FROM clinical.barthel_assessments a USING clinical.visits v, clinical.patients p
      WHERE a.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M38A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.er_triage_levels r USING clinical.visits v, clinical.patients p
      WHERE r.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M38A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.visits v USING clinical.patients p WHERE v.patient_id=p.id AND p.tags @> '["M38A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M38A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('护士屏急诊/Barthel（真实 PG）', () => {
  it('evaluations 返回 er+rehab 块', async () => {
    const { visit } = await newPV();
    await triageView(admin, { visitId: visit.id, chiefComplaint: 'cardiac', systolicBp: 70 });
    await recordBarthelView(admin, {
      visitId: visit.id,
      feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10,
    });
    const out = await getVisitEvaluations(admin, visit.id);
    expect(out.summary.er).toBeTruthy();
    expect(out.summary.er.level).toBe('I');
    expect(out.summary.rehab).toBeTruthy();
    expect(out.summary.rehab.totalScore).toBe(100);
  });
});
