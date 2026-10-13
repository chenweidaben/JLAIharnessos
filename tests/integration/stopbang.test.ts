/**
 * 健澜科技 jlmedaios - STOP-BANG 集成测试（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { assessView, listView, StopBangError } from '../../src/bff/aggregators/stopbangAggregator.js';
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
        await sql`DELETE FROM improvement_tasks WHERE visit_id=${c.visitId} AND source='quality_safety'`;
        await sql`DELETE FROM clinical.stopbang_screenings WHERE visit_id=${c.visitId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `SB${seq()}`, nameMasked: `睡*${seq().slice(-4)}`, gender: '男',
    birthDate: '1955-01-01', tags: ['M59_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '呼吸内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('STOP-BANG 聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('stopbang:assess');
    expect(admin.permissions).toContain('stopbang:view');
  });

  it('录入 200 算出分数与风险', async () => {
    const { visitId } = await seed();
    const r = await assessView(admin, {
      visitId, sSnoring: true, bBmi: true, aAge: true, tTired: false, oObserved: false,
      pPressure: false, nNeck: false, gGender: false,
    });
    expect(r.screening.score).toBe(3);
    expect(r.screening.riskLevel).toBe('high');
    expect(r.workOrderCreated).toBe(true);
  });

  it('score<3 不建工单', async () => {
    const { visitId } = await seed();
    const r = await assessView(admin, {
      visitId, sSnoring: false, tTired: true, oObserved: false, pPressure: false,
      bBmi: false, aAge: false, nNeck: false, gGender: false,
    });
    expect(r.screening.score).toBe(1);
    expect(r.screening.riskLevel).toBe('low');
    expect(r.workOrderCreated).toBe(false);
  });

  it('列表返回筛查记录', async () => {
    const { visitId } = await seed();
    await assessView(admin, {
      visitId, sSnoring: true, tTired: false, oObserved: false, pPressure: false,
      bBmi: false, aAge: false, nNeck: false, gGender: false,
    });
    const list = await listView(admin, visitId);
    expect(list.length).toBeGreaterThan(0);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000dd', dataScope: 'self' };
    let status = 200;
    try {
      await assessView(outsider, {
        visitId, sSnoring: true, tTired: false, oObserved: false, pPressure: false,
        bBmi: false, aAge: false, nNeck: false, gGender: false,
      });
    } catch (e) { status = e instanceof StopBangError ? e.status : 500; }
    expect(status).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let status = 200;
    try {
      await assessView(noPerm, {
        visitId, sSnoring: true, tTired: false, oObserved: false, pPressure: false,
        bBmi: false, aAge: false, nNeck: false, gGender: false,
      });
    } catch (e) { status = e instanceof StopBangError ? e.status : 500; }
    expect(status).toBe(403);
  });
});
