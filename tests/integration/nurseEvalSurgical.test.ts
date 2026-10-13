/**
 * 健澜科技 jlmedaios - M83-A 护士屏手术核查块集成测试
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { getVisitEvaluations, EvalError } from '../../src/bff/aggregators/nurseStationEvalAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createChecklist, updateStage } from '../../src/db/repositories/surgicalChecklistRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; surgeryId: string }[] = [];

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
        await sql`DELETE FROM clinical.surgical_checklists WHERE surgery_id=${c.surgeryId}`;
        await sql`DELETE FROM clinical.surgery_requests WHERE id=${c.surgeryId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seedFailed(): Promise<{ visitId: string }> {
  const patient = await createPatient({
    mrn: `M83${seq()}`, nameMasked: `屏*${seq().slice(-4)}`, gender: '男',
    birthDate: '1968-01-01', tags: ['M83_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '普外科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  const db = getDb();
  const sr = await db`
    INSERT INTO clinical.surgery_requests (request_no, visit_id, patient_id, planned_procedure)
    VALUES (${`SR-M83-${seq()}`}, ${visit.id}, ${patient.id}, 'appendectomy')
    RETURNING id`;
  const surgeryId = String(sr[0].id);
  const c = await createChecklist(surgeryId);
  await updateStage(c.id, 'signin', { patientConfirmed: true }, 'failed');
  cleanup.push({ patientId: patient.id, visitId: visit.id, surgeryId });
  return { visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('护士屏手术核查块（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('nurse_eval:view');
  });

  it('evaluations 返回 surgical 块且 failed 标红', async () => {
    const { visitId } = await seedFailed();
    const r = await getVisitEvaluations(admin, visitId);
    expect(r.summary.surgical.signinComplete).toBe(true);
    expect(r.summary.surgical.timeoutComplete).toBe(false);
    expect(r.summary.surgical.failed).toBe(true);
    expect(r.summary.flags).toContain('surgical_check_failed');
    expect(r.latestSurgicalChecklist).not.toBeNull();
  });

  it('越权（self 数据范围且非主治）→ 403', async () => {
    const { visitId } = await seedFailed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000ee', dataScope: 'self' };
    let status = 200;
    try { await getVisitEvaluations(outsider, visitId); } catch (e) {
      status = e instanceof EvalError ? e.status : 500;
    }
    expect(status).toBe(403);
  });
});
