/**
 * 健澜科技 jlmedaios - 营养科会诊集成测试（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { consultView, followupView, listView, NutritionConsultError } from '../../src/bff/aggregators/nutritionConsultAggregator.js';
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
        await sql`DELETE FROM clinical.nutrition_consults WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `NC${seq()}`, nameMasked: `营*${seq().slice(-4)}`, gender: '女',
    birthDate: '1955-01-01', tags: ['M58_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '消化内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('营养科会诊聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('nutrition_consult:manage');
    expect(admin.permissions).toContain('nutrition_consult:view');
  });

  it('会诊录入 200 返回方案分级', async () => {
    const { visitId } = await seed();
    const r = await consultView(admin, {
      visitId, nutritionDiagnosis: '营养不良', plan: '高蛋白', caloriesPerDay: 2000, followupDays: 7,
    });
    expect(r.consult.status).toBe('consulted');
    expect(r.planTier).toBe('normal');
  });

  it('随访记录 -> status=followed_up', async () => {
    const { visitId } = await seed();
    const c = await consultView(admin, {
      visitId, nutritionDiagnosis: 'x', plan: 'y', caloriesPerDay: 1500, followupDays: 7,
    });
    const fu = await followupView(admin, c.consult.id);
    expect(fu.status).toBe('followed_up');
  });

  it('列表返回会诊记录', async () => {
    const { visitId } = await seed();
    await consultView(admin, { visitId, nutritionDiagnosis: 'x', plan: 'y', caloriesPerDay: 1800 });
    const list = await listView(admin, visitId, new Date().toISOString());
    expect(list.length).toBeGreaterThan(0);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000dd', dataScope: 'self' };
    let status = 200;
    try {
      await consultView(outsider, { visitId, nutritionDiagnosis: 'x', plan: 'y', caloriesPerDay: 1800 });
    } catch (e) { status = e instanceof NutritionConsultError ? e.status : 500; }
    expect(status).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let status = 200;
    try {
      await consultView(noPerm, { visitId, nutritionDiagnosis: 'x', plan: 'y', caloriesPerDay: 1800 });
    } catch (e) { status = e instanceof NutritionConsultError ? e.status : 500; }
    expect(status).toBe(403);
  });
});
