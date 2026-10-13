/**
 * 健澜科技 jlmedaios - CGA 集成测试（M56-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { assessView, listView, CgaError } from '../../src/bff/aggregators/cgaAggregator.js';
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
    mrn: `CG${seq()}`, nameMasked: `老*${seq().slice(-4)}`, gender: '男',
    birthDate: '1935-01-01', tags: ['M56_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '心血管内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  cleanup.push({ patientId: patient.id, visitId: visit.id });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('CGA 聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('cga:assess');
    expect(admin.permissions).toContain('cga:view');
  });

  it('录入 high -> 自动建 quality_safety 工单', async () => {
    const { visitId } = await seed();
    const r = await assessView(admin, {
      visitId, adlScore: 50, iadlScore: 20, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2,
    });
    expect(r.assessment.riskLevel).toBe('high');
    expect(r.flags).toContain('adl_dependent');
    expect(r.interventionWorkOrderCreated).toBe(true);
  });

  it('录入 low -> 不建工单', async () => {
    const { visitId } = await seed();
    const r = await assessView(admin, {
      visitId, adlScore: 100, iadlScore: 28, mmseScore: 30, fallRisk: false, mnaScore: 14, gdsScore: 0,
    });
    expect(r.assessment.riskLevel).toBe('low');
    expect(r.interventionWorkOrderCreated).toBe(false);
  });

  it('列表返回录入记录', async () => {
    const { visitId } = await seed();
    await assessView(admin, {
      visitId, adlScore: 90, iadlScore: 25, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2,
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
        visitId, adlScore: 90, iadlScore: 25, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2,
      });
    } catch (e) { status = e instanceof CgaError ? e.status : 500; }
    expect(status).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let status = 200;
    try {
      await assessView(noPerm, {
        visitId, adlScore: 90, iadlScore: 25, mmseScore: 28, fallRisk: false, mnaScore: 13, gdsScore: 2,
      });
    } catch (e) { status = e instanceof CgaError ? e.status : 500; }
    expect(status).toBe(403);
  });
});
