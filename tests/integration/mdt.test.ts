/**
 * 健澜科技 jlmedaios - MDT 会诊集成测试（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  createView, listView, minutesView, scheduleView, MdtError,
} from '../../src/bff/aggregators/mdtAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; visitId: string; consultId: string }[] = [];

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
        await sql`DELETE FROM clinical.mdt_consults WHERE id=${c.consultId}`;
        await sql`DELETE FROM clinical.visits WHERE id=${c.visitId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `MD${seq()}`, nameMasked: `会*${seq().slice(-4)}`, gender: '男',
    birthDate: '1958-01-01', tags: ['M66_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '肿瘤科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  return { patientId: patient.id, visitId: visit.id };
}

const D = dbAvailable ? describe : describe.skip;

D('MDT 会诊聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('mdt:request');
    expect(admin.permissions).toContain('mdt:view');
  });

  it('发起会诊 200', async () => {
    const { patientId, visitId } = await seed();
    const c = await createView(admin, { visitId, title: '肺癌多学科讨论', reason: '术后方案', departments: ['肿瘤科', '胸外科'] });
    expect(c.status).toBe('requested');
    cleanup.push({ patientId, visitId, consultId: c.id });
  });

  it('排期 -> scheduled', async () => {
    const { patientId, visitId } = await seed();
    const c = await createView(admin, { visitId, title: '肝癌讨论', reason: '介入', departments: ['肿瘤科'] });
    cleanup.push({ patientId, visitId, consultId: c.id });
    const s = await scheduleView(admin, c.id, '2026-11-01 09:00+08');
    expect(s.status).toBe('scheduled');
  });

  it('录纪要 -> concluded', async () => {
    const { patientId, visitId } = await seed();
    const c = await createView(admin, { visitId, title: '胃癌讨论', reason: '手术', departments: ['胃肠外科'] });
    cleanup.push({ patientId, visitId, consultId: c.id });
    const m = await minutesView(admin, c.id, '讨论充分', '建议根治手术');
    expect(m.status).toBe('concluded');
  });

  it('列表', async () => {
    const { visitId } = await seed();
    await createView(admin, { visitId, title: '列表测试', reason: 'x', departments: [] });
    const list = await listView(admin, visitId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { visitId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-0000000000ff', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, visitId); }
    catch (e) { code = e instanceof MdtError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { visitId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, visitId); }
    catch (e) { code = e instanceof MdtError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
