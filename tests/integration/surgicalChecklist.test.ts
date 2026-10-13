/**
 * 健澜科技 jlmedaios - 手术核查表集成测试（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createView, stageView, SurgicalCheckError } from '../../src/bff/aggregators/surgicalChecklistAggregator.js';

let dbAvailable = false;
let admin: AuthView;
const cleanup: string[] = [];

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) {
    await execTestCleanup(async (sql) => {
      for (const id of cleanup) {
        await sql`DELETE FROM clinical.surgical_checklists WHERE id=${id}`;
      }
    });
    await closeDbForTest();
  }
});

const D = dbAvailable ? describe : describe.skip;

D('手术核查表聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('surgical_check:complete');
    expect(admin.permissions).toContain('surgical_check:view');
  });

  it('建单 200', async () => {
    const surgeryId = crypto.randomUUID();
    const c = await createView(admin, surgeryId);
    cleanup.push(c.id);
    expect(c.status).toBe('in_progress');
  });

  it('signin 缺项 → failed', async () => {
    const surgeryId = crypto.randomUUID();
    const c = await createView(admin, surgeryId);
    cleanup.push(c.id);
    const r = await stageView(admin, c.id, 'signin', { patientConfirmed: true });
    expect(r.status).toBe('failed');
  });

  it('全项通过 → passed', async () => {
    const surgeryId = crypto.randomUUID();
    const c = await createView(admin, surgeryId);
    cleanup.push(c.id);
    await stageView(admin, c.id, 'signin', { patientConfirmed: true, allergyConfirmed: true, bloodPrepared: true });
    await stageView(admin, c.id, 'timeout', { siteMarked: true, procedureConfirmed: true, antibioticGiven: true });
    const r = await stageView(admin, c.id, 'signout', { instrumentsCounted: true });
    expect(r.status).toBe('passed');
  });

  it('越权（self）-> 403', async () => {
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000082', dataScope: 'self' };
    let code = 200;
    try { await createView(outsider, crypto.randomUUID()); }
    catch (e) { code = e instanceof SurgicalCheckError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await createView(noPerm, crypto.randomUUID()); }
    catch (e) { code = e instanceof SurgicalCheckError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
