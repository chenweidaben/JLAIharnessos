/**
 * 健澜科技 jlmedaios - MDT 治疗方案集成测试（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  confirmView, draftView, listView, TreatmentPlanError,
} from '../../src/bff/aggregators/mdtTreatmentPlanAggregator.js';
import { createView } from '../../src/bff/aggregators/mdtAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; consultId: string; planId: string }[] = [];

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
        await sql`DELETE FROM clinical.mdt_treatment_plans WHERE id=${c.planId}`;
        await sql`DELETE FROM clinical.mdt_consults WHERE id=${c.consultId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seedConsult() {
  const patient = await createPatient({
    mrn: `TP${seq()}`, nameMasked: `案*${seq().slice(-4)}`, gender: '女',
    birthDate: '1965-01-01', tags: ['M67_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '肿瘤科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  const consult = await createView(admin, {
    visitId: visit.id, title: '乳腺癌 MDT', reason: '术后辅助', departments: ['乳腺外科'],
  });
  return { patientId: patient.id, visitId: visit.id, consultId: consult.id };
}

const D = dbAvailable ? describe : describe.skip;

D('MDT 治疗方案聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('treatment_plan:manage');
    expect(admin.permissions).toContain('treatment_plan:view');
  });

  it('MDT 后自动建草稿 200', async () => {
    const s = await seedConsult();
    const plan = await draftView(admin, {
      mdtConsultId: s.consultId, visitId: s.visitId, departments: ['乳腺外科'], conclusion: '建议手术',
    });
    expect(plan.status).toBe('draft');
    cleanup.push({ ...s, planId: plan.id });
  });

  it('确认 -> confirmed + 排程', async () => {
    const s = await seedConsult();
    const plan = await draftView(admin, {
      mdtConsultId: s.consultId, visitId: s.visitId, departments: ['乳腺外科'], conclusion: '手术',
    });
    cleanup.push({ ...s, planId: plan.id });
    const c = await confirmView(admin, plan.id, '2026-11-01 09:00+08');
    expect(c.status).toBe('confirmed');
    expect(c.scheduledAt).toBeTruthy();
  });

  it('列表', async () => {
    const s = await seedConsult();
    await draftView(admin, { mdtConsultId: s.consultId, visitId: s.visitId, departments: [], conclusion: 'x' });
    const list = await listView(admin, s.visitId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const s = await seedConsult();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000aa', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, s.visitId); }
    catch (e) { code = e instanceof TreatmentPlanError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const s = await seedConsult();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, s.visitId); }
    catch (e) { code = e instanceof TreatmentPlanError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
