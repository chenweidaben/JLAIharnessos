/**
 * 健澜科技 jlmedaios - 院感看板集成测试（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { dashboardView, submitView, InfectionDashError } from '../../src/bff/aggregators/infectionDashboardAggregator.js';

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
        await sql`DELETE FROM clinical.infection_metrics WHERE id=${id}`;
      }
    });
    await closeDbForTest();
  }
});

const D = dbAvailable ? describe : describe.skip;

D('院感看板聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('infection_dash:submit');
    expect(admin.permissions).toContain('infection_dash:view');
  });

  it('提交 200', async () => {
    const m = await submitView(admin, {
      month: '2026-07', department: 'M76_TEST_A',
      handHygieneObservations: 100, handHygieneCompliant: 90,
      cautiCases: 1, catheterDays: 200,
    });
    cleanup.push(m.id);
    expect(m.department).toBe('M76_TEST_A');
  });

  it('看板月度列表 + 计算率', async () => {
    const a = await submitView(admin, { month: '2026-07', department: 'M76_TEST_B', handHygieneObservations: 100, handHygieneCompliant: 80 });
    const b = await submitView(admin, { month: '2026-07', department: 'M76_TEST_C', cautiCases: 2, catheterDays: 100 });
    cleanup.push(a.id, b.id);
    const rows = await dashboardView(admin, '2026-07');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const rowB = rows.find((r) => r.department === 'M76_TEST_B')!;
    expect(rowB.handHygieneRate).toBe(80);
  });

  it('科室按感染率降序', async () => {
    const low = await submitView(admin, { month: '2026-08', department: 'M76_LOW', cautiCases: 0, catheterDays: 100 });
    const high = await submitView(admin, { month: '2026-08', department: 'M76_HIGH', cautiCases: 5, catheterDays: 100 });
    cleanup.push(low.id, high.id);
    const rows = await dashboardView(admin, '2026-08');
    const depts = rows.map((r) => r.department);
    expect(depts.indexOf('M76_HIGH')).toBeLessThan(depts.indexOf('M76_LOW'));
  });

  it('越权（self）-> 403', async () => {
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000076', dataScope: 'self' };
    let code = 200;
    try { await dashboardView(outsider, '2026-07'); }
    catch (e) { code = e instanceof InfectionDashError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await dashboardView(noPerm, '2026-07'); }
    catch (e) { code = e instanceof InfectionDashError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
