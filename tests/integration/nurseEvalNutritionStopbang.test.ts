/**
 * 健澜科技 jlmedaios - M60-A 护士屏营养会诊/睡眠块集成测试
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { consultView } from '../../src/bff/aggregators/nutritionConsultAggregator.js';
import { assessView as stopbangAssess } from '../../src/bff/aggregators/stopbangAggregator.js';

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
        await sql`DELETE FROM clinical.nutrition_consults WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.stopbang_screenings WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.improvement_tasks WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `M60${seq()}`, nameMasked: `屏*${seq().slice(-4)}`, gender: '男',
    birthDate: '1935-01-01', tags: ['M60_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '消化内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('护士屏营养会诊/睡眠块（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('nurse_eval:view');
  });

  it('evaluations 返回 nutritionConsult 与 stopbang 块', async () => {
    const { visitId } = await seed();
    await consultView(admin, { visitId, nutritionDiagnosis: '营养不良', plan: '高蛋白', caloriesPerDay: 2800 });
    await stopbangAssess(admin, {
      visitId, sSnoring: true, tTired: true, oObserved: true, pPressure: false,
      bBmi: false, aAge: false, nNeck: false, gGender: false,
    });
    const r = await getVisitEvaluations(admin, visitId);
    expect(r.summary.nutritionConsult.caloriesPerDay).toBe(2800);
    expect(r.summary.nutritionConsult.planTier).toBe('high');
    expect(r.summary.stopbang.score).toBe(3);
    expect(r.summary.stopbang.highRisk).toBe(true);
    expect(r.summary.flags).toContain('osa_high_risk');
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000dd', dataScope: 'self' };
    let status = 200;
    try { await getVisitEvaluations(outsider, visitId); } catch (e) {
      status = e instanceof EvalError ? e.status : 500;
    }
    expect(status).toBe(403);
  });
});
