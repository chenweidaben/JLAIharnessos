/**
 * 健澜科技 jlmedaios - 输血反应集成测试（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listView, reportView, TransfusionError } from '../../src/bff/aggregators/transfusionReactionAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; reactionId: string }[] = [];

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
        await sql`DELETE FROM clinical.transfusion_reactions WHERE id=${c.reactionId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `TF${seq()}`, nameMasked: `输*${seq().slice(-4)}`, gender: '男',
    birthDate: '1965-01-01', tags: ['M71_TEST'],
  });
  return { patientId: patient.id };
}

const D = dbAvailable ? describe : describe.skip;

D('输血反应聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('transfusion:report');
    expect(admin.permissions).toContain('transfusion:view');
  });

  it('报告 200', async () => {
    const { patientId } = await seed();
    const r = await reportView(admin, { patientId, reactionType: 'fever', severity: 'mild', symptoms: '发热' });
    expect(r.reactionType).toBe('fever');
    expect(r.blocked).toBe(false);
    cleanup.push({ patientId, reactionId: r.id });
  });

  it('hemolysis -> blocked=true', async () => {
    const { patientId } = await seed();
    const r = await reportView(admin, { patientId, reactionType: 'hemolysis', severity: 'mild', symptoms: '腰痛血尿' });
    expect(r.blocked).toBe(true);
    cleanup.push({ patientId, reactionId: r.id });
  });

  it('severe fever -> blocked', async () => {
    const { patientId } = await seed();
    const r = await reportView(admin, { patientId, reactionType: 'fever', severity: 'severe', symptoms: '高热寒战' });
    expect(r.blocked).toBe(true);
    cleanup.push({ patientId, reactionId: r.id });
  });

  it('列表', async () => {
    const { patientId } = await seed();
    await reportView(admin, { patientId, reactionType: 'fever', severity: 'mild', symptoms: '发热' });
    const list = await listView(admin, patientId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { patientId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000071', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, patientId); }
    catch (e) { code = e instanceof TransfusionError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { patientId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, patientId); }
    catch (e) { code = e instanceof TransfusionError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
