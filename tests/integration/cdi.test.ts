/**
 * 健澜科技 jlmedaios - CDI 用药审查集成测试（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listView, resolveView, reviewView, CdiError } from '../../src/bff/aggregators/cdiAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; reviewId: string }[] = [];

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
        await sql`DELETE FROM clinical.cdi_reviews WHERE id=${c.reviewId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `CD${seq()}`, nameMasked: `审*${seq().slice(-4)}`, gender: '男',
    birthDate: '1965-01-01', tags: ['M70_TEST'],
  });
  return { patientId: patient.id };
}

const D = dbAvailable ? describe : describe.skip;

D('CDI 用药审查聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('cdi:review');
    expect(admin.permissions).toContain('cdi:view');
  });

  it('审查 200', async () => {
    const { patientId } = await seed();
    const r = await reviewView(admin, { patientId, drugName: 'metformin', currentDrugs: [], allergies: [] });
    expect(r.drugName).toBe('metformin');
    cleanup.push({ patientId, reviewId: r.id });
  });

  it('过敏命中 -> block', async () => {
    const { patientId } = await seed();
    const r = await reviewView(admin, { patientId, drugName: 'penicillin', allergies: ['penicillin'] });
    expect(r.severity).toBe('block');
    cleanup.push({ patientId, reviewId: r.id });
  });

  it('剂量超限 -> warning', async () => {
    const { patientId } = await seed();
    const r = await reviewView(admin, { patientId, drugName: 'drugA', doseMg: 300, weightKg: 50 });
    expect(r.severity).toBe('warning');
    cleanup.push({ patientId, reviewId: r.id });
  });

  it('resolve -> resolved', async () => {
    const { patientId } = await seed();
    const r = await reviewView(admin, { patientId, drugName: 'drugB', currentDrugs: [], allergies: [] });
    cleanup.push({ patientId, reviewId: r.id });
    const resolved = await resolveView(admin, r.id);
    expect(resolved.resolved).toBe(true);
  });

  it('列表', async () => {
    const { patientId } = await seed();
    await reviewView(admin, { patientId, drugName: 'drugC', currentDrugs: [], allergies: [] });
    const list = await listView(admin, patientId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { patientId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000070', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, patientId); }
    catch (e) { code = e instanceof CdiError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { patientId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, patientId); }
    catch (e) { code = e instanceof CdiError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
