/**
 * 健澜科技 jlmedaios - SBAR 交接集成测试（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  closeView, createView, listView, receiveView, SbarError,
} from '../../src/bff/aggregators/sbarAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; handoffId: string }[] = [];

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
        await sql`DELETE FROM clinical.sbar_handoffs WHERE id=${c.handoffId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `SB${seq()}`, nameMasked: `转*${seq().slice(-4)}`, gender: '男',
    birthDate: '1965-01-01', tags: ['M73_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '急诊',
    chiefComplaint: 'x', status: 'ongoing',
  });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('SBAR 交接聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('sbar:create');
    expect(admin.permissions).toContain('sbar:view');
  });

  it('建交接 200', async () => {
    const { patientId, visitId } = await seed();
    const r = await createView(admin, {
      visitId, fromUnit: '急诊', toUnit: 'ICU',
      situation: '胸痛', background: '冠心病', assessment: '高危', recommendation: '转 ICU',
    });
    expect(r.status).toBe('pending');
    cleanup.push({ patientId, visitId, handoffId: r.id });
  });

  it('接收 -> received', async () => {
    const { patientId, visitId } = await seed();
    const created = await createView(admin, {
      visitId, fromUnit: '急诊', toUnit: 'ICU',
      situation: 's', background: 'b', assessment: 'a', recommendation: 'r',
    });
    cleanup.push({ patientId, visitId, handoffId: created.id });
    const rec = await receiveView(admin, created.id);
    expect(rec.status).toBe('received');
  });

  it('未接收直接 close -> 冲突', async () => {
    const { patientId, visitId } = await seed();
    const created = await createView(admin, {
      visitId, fromUnit: '急诊', toUnit: 'ICU',
      situation: 's', background: 'b', assessment: 'a', recommendation: 'r',
    });
    cleanup.push({ patientId, visitId, handoffId: created.id });
    let code = 200;
    try { await closeView(admin, created.id); }
    catch (e) { code = e instanceof SbarError ? e.status : 500; }
    expect(code).toBe(409);
  });

  it('双方确认 -> closed', async () => {
    const { patientId, visitId } = await seed();
    const created = await createView(admin, {
      visitId, fromUnit: '急诊', toUnit: 'ICU',
      situation: 's', background: 'b', assessment: 'a', recommendation: 'r',
    });
    cleanup.push({ patientId, visitId, handoffId: created.id });
    await receiveView(admin, created.id);
    const closed = await closeView(admin, created.id);
    expect(closed.status).toBe('closed');
  });

  it('列表', async () => {
    const { patientId, visitId } = await seed();
    await createView(admin, {
      visitId, fromUnit: '急诊', toUnit: 'ICU',
      situation: 's', background: 'b', assessment: 'a', recommendation: 'r',
    });
    const list = await listView(admin, visitId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { patientId, visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000073', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, visitId); }
    catch (e) { code = e instanceof SbarError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { patientId, visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, visitId); }
    catch (e) { code = e instanceof SbarError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
