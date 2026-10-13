/**
 * 健澜科技 jlmedaios - M57-A 护士屏 CGA 块集成测试
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { assessView } from '../../src/bff/aggregators/cgaAggregator.js';

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
        await sql`DELETE FROM clinical.clinical_improvement_tasks WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.cga_assessments WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `M57${seq()}`, nameMasked: `屏*${seq().slice(-4)}`, gender: '男',
    birthDate: '1935-01-01', tags: ['M57_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '心血管内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('护士屏 CGA 块（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('nurse_eval:view');
  });

  it('evaluations 返回 cga 块且 high 标红', async () => {
    const { visitId } = await seed();
    await assessView(admin, {
      visitId, adlScore: 50, iadlScore: 20, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2,
    });
    const r = await getVisitEvaluations(admin, visitId);
    expect(r.summary.cga.adlScore).toBe(50);
    expect(r.summary.cga.highRisk).toBe(true);
    expect(r.summary.flags).toContain('cga_high_risk');
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
