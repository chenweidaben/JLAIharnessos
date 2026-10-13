/**
 * 健澜科技 jlmedaios - PICC 维护集成测试（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listView, recordView, PiccError } from '../../src/bff/aggregators/piccAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanup: { patientId: string; maintenanceId: string }[] = [];

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
        await sql`DELETE FROM clinical.picc_maintenances WHERE id=${c.maintenanceId}`;
        await sql`DELETE FROM clinical.patients WHERE id=${c.patientId}`;
      }
    });
    await closeDbForTest();
  }
});

async function seed() {
  const patient = await createPatient({
    mrn: `PT${seq()}`, nameMasked: `护*${seq().slice(-4)}`, gender: '女',
    birthDate: '1968-01-01', tags: ['M68_TEST'],
  });
  return { patientId: patient.id };
}

const D = dbAvailable ? describe : describe.skip;

D('PICC 维护聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('picc:maintain');
    expect(admin.permissions).toContain('picc:view');
  });

  it('录入维护 200', async () => {
    const { patientId } = await seed();
    const m = await recordView(admin, {
      patientId, deviceType: 'picc', insertedAt: '2026-09-01', lastMaintainedAt: '2026-10-10',
      dressingChanged: true, flushed: true, complication: 'none', notes: 'ok',
    });
    expect(m.deviceType).toBe('picc');
    cleanup.push({ patientId, maintenanceId: m.id });
  });

  it('thrombosis 记录可录入（并发症字段落库）', async () => {
    const { patientId } = await seed();
    const m = await recordView(admin, {
      patientId, deviceType: 'port', insertedAt: '2026-08-01', lastMaintainedAt: '2026-10-10',
      dressingChanged: true, flushed: true, complication: 'thrombosis', notes: '肿胀',
    });
    expect(m.complication).toBe('thrombosis');
    cleanup.push({ patientId, maintenanceId: m.id });
  });

  it('列表', async () => {
    const { patientId } = await seed();
    await recordView(admin, {
      patientId, deviceType: 'picc', insertedAt: '2026-09-01', lastMaintainedAt: '2026-10-10',
      dressingChanged: true, flushed: true, complication: 'none', notes: 'x',
    });
    const list = await listView(admin, patientId);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('越权（self 非主治）-> 403', async () => {
    const { patientId } = await seed();
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000068', dataScope: 'self' };
    let code = 200;
    try { await listView(outsider, patientId); }
    catch (e) { code = e instanceof PiccError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const { patientId } = await seed();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await listView(noPerm, patientId); }
    catch (e) { code = e instanceof PiccError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
