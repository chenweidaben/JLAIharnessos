/**
 * 健澜科技 jlmedaios - M53-A 护士屏康复/疼痛块集成测试
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { prescribeTreatment } from '../../src/db/repositories/rehabTreatmentRepo.js';
import { createRecord } from '../../src/db/repositories/painClinicRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string }[] = [];

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) {
    await execTestCleanup(async (sql) => {
      for (const c of cleanup) {
        await sql`DELETE FROM clinical.rehab_treatments WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.pain_clinic_records WHERE patient_id=${c.patientId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `M53${seq()}`, nameMasked: `屏*${seq().slice(-4)}`, gender: '男',
    birthDate: '1968-01-01', tags: ['M53_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '心血管内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('护士屏康复/疼痛块（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('nurse_eval:view');
  });

  it('evaluations 返回 rehabTreatment + painClinic 两块', async () => {
    const { patientId, visitId } = await seed();
    await prescribeTreatment({ visitId, modality: 'pt', prescribedBy: admin.id, scheduledDate: '2026-10-14' });
    await createRecord({
      patientId, visitId, baselineNrs: 9, currentNrs: 8, breakthroughCount: 0,
      analgesic: 'morphine', titrationRound: 1, adjustmentSuggestion: 'x', recordedBy: admin.id,
    });
    const r = await getVisitEvaluations(admin, visitId);
    expect(r.summary.rehabTreatment.modality).toBe('pt');
    expect(r.summary.painClinic.currentNrs).toBe(8);
    expect(r.summary.painClinic.severeNrs).toBe(true);
    expect(r.summary.flags).toContain('pain_severe_nrs');
  });

  it('越权（self 数据范围且非主治）→ 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000dd', dataScope: 'self' };
    let status = 200;
    try { await getVisitEvaluations(outsider, visitId); } catch (e) {
      status = e instanceof EvalError ? e.status : 500;
    }
    expect(status).toBe(403);
  });
});
