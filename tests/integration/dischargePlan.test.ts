/**
 * 健澜科技 jlmedaios - 出院计划集成测试（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { planView, pushView, listView, DischargePlanError } from '../../src/bff/aggregators/dischargePlanAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

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
        await sql`DELETE FROM clinical.patient_notifications WHERE ref_id IN (SELECT id FROM clinical.discharge_plans WHERE visit_id=${c.visitId})`;
        await sql`DELETE FROM clinical.discharge_plans WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `DP${seq()}`, nameMasked: `出*${seq().slice(-4)}`, gender: '男',
    birthDate: '1955-01-01', tags: ['M61_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '内分泌科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('出院计划聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('discharge_plan:manage');
    expect(admin.permissions).toContain('discharge_plan:view');
  });

  it('建计划 200 返回建议复诊日期', async () => {
    const { visitId } = await seed();
    const r = await planView(admin, { visitId, medicationSummary: '二甲双胍 0.5g bid', diagnoses: ['2型糖尿病'] });
    expect(r.plan.status).toBe('planned');
    expect(r.plan.followupDepartment).toBe('内分泌科');
    expect(r.suggestedFollowupDate).toBeTruthy();
  });

  it('push -> status=pushed', async () => {
    const { visitId } = await seed();
    const r = await planView(admin, { visitId, medicationSummary: 'x' });
    const pushed = await pushView(admin, r.plan.id);
    expect(pushed.status).toBe('pushed');
  });

  it('列表返回计划', async () => {
    const { visitId } = await seed();
    await planView(admin, { visitId, medicationSummary: 'x' });
    const list = await listView(admin, visitId);
    expect(list.length).toBeGreaterThan(0);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000dd', dataScope: 'self' };
    let status = 200;
    try {
      await planView(outsider, { visitId, medicationSummary: 'x' });
    } catch (e) { status = e instanceof DischargePlanError ? e.status : 500; }
    expect(status).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let status = 200;
    try {
      await planView(noPerm, { visitId, medicationSummary: 'x' });
    } catch (e) { status = e instanceof DischargePlanError ? e.status : 500; }
    expect(status).toBe(403);
  });
});
