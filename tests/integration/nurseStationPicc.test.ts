/**
 * 健澜科技 jlmedaios - 护士屏 PICC 块集成测试（M69-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';
import { recordView } from '../../src/bff/aggregators/piccAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; maintenanceId: string }[] = [];

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
        await sql`DELETE FROM clinical.picc_maintenances WHERE id=${c.maintenanceId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `NP${seq()}`, nameMasked: `屏*${seq().slice(-4)}`, gender: '女',
    birthDate: '1970-01-01', tags: ['M69_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '肿瘤科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  const m = await recordView(admin, {
    patientId: patient.id, deviceType: 'picc', insertedAt: '2026-09-01', lastMaintainedAt: new Date().toISOString().slice(0, 10),
    dressingChanged: true, flushed: true, complication: 'none', notes: '',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id, maintenanceId: m.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('护士屏 PICC 块（真实 PG）', () => {
  it('evaluations 返回 picc 块', async () => {
    const { visitId } = await seed();
    const ev = await getVisitEvaluations(admin, visitId);
    expect((ev.summary as Record<string, unknown>).picc).toBeTruthy();
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000069', dataScope: 'self' };
    let code = 200;
    try { await getVisitEvaluations(outsider, visitId); }
    catch (e) { code = e instanceof EvalError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
