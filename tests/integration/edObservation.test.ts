/**
 * 健澜科技 jlmedaios - 急诊留观集成测试（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { closeView, listView, registerView, EdObsError } from '../../src/bff/aggregators/edObservationAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; obsId: string }[] = [];

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
        await sql`DELETE FROM clinical.ed_observations WHERE id=${c.obsId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `EO${seq()}`, nameMasked: `急*${seq().slice(-4)}`, gender: '男',
    birthDate: '1965-01-01', tags: ['M74_TEST'],
  });
  return { patientId: patient.id };
}

const D = dbAvailable ? describe : describe.skip;

D('急诊留观聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('ed_obs:register');
    expect(admin.permissions).toContain('ed_obs:view');
  });

  it('登记 200', async () => {
    const { patientId } = await seed();
    const r = await registerView(admin, { patientId, triageLevel: 'III' });
    expect(r.status).toBe('observing');
    cleanup.push({ patientId, obsId: r.id });
  });

  it('close -> closed', async () => {
    const { patientId } = await seed();
    const created = await registerView(admin, { patientId, triageLevel: 'IV' });
    cleanup.push({ patientId, obsId: created.id });
    const closed = await closeView(admin, created.id, 'discharged');
    expect(closed.status).toBe('closed');
    expect(closed.disposition).toBe('discharged');
  });

  it('>24h 滞留观察记录状态可见（纯函数 needsAlert 已单测）', async () => {
    const { patientId } = await seed();
    // 手工插入一条进入时间 >24h 前的 observing 记录
    const db = getDb();
    const rows = await db`
      INSERT INTO clinical.ed_observations (patient_id, triage_level, entered_at, registered_by)
      VALUES (${patientId}, 'II', now() - interval '25 hours', ${admin.id})
      RETURNING id`;
    const oldId = String((rows[0] as Record<string, unknown>).id);
    cleanup.push({ patientId, obsId: oldId });
    const list = await listView(admin, { patientId });
    expect(list.length).toBeGreaterThanOrEqual(1);
    // 进入时间距今应 >24h
    const top = list.find((x) => x.id === oldId)!;
    const hours = (Date.now() - new Date(top.enteredAt).getTime()) / 3_600_000;
    expect(hours).toBeGreaterThan(24);
  });

  it('按患者列表', async () => {
    const { patientId } = await seed();
    await registerView(admin, { patientId, triageLevel: 'III' });
    const list = await listView(admin, { patientId });
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { patientId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000074', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, { patientId }); }
    catch (e) { code = e instanceof EdObsError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { patientId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, { patientId }); }
    catch (e) { code = e instanceof EdObsError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
