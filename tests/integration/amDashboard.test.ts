/**
 * 健澜科技 jlmedaios - 药事看板集成测试（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { dashboardView, submitView, AmDashError } from '../../src/bff/aggregators/amDashboardAggregator.js';

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
        await sql`DELETE FROM clinical.am_metrics WHERE id=${id}`;
      }
    });
    await closeDbForTest();
  }
});

const D = dbAvailable ? describe : describe.skip;

D('药事看板聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('am_dash:submit');
    expect(admin.permissions).toContain('am_dash:view');
  });

  it('提交 200', async () => {
    const m = await submitView(admin, {
      month: '2026-07', department: 'M77_TEST_A',
      dddsTotal: 40, inpatientDays: 1000,
      antibioticPatients: 20, totalInpatients: 100,
    });
    cleanup.push(m.id);
    expect(m.department).toBe('M77_TEST_A');
  });

  it('看板月度列表 + 计算率', async () => {
    const a = await submitView(admin, { month: '2026-07', department: 'M77_TEST_B', dddsTotal: 30, inpatientDays: 1000 });
    cleanup.push(a.id);
    const rows = await dashboardView(admin, '2026-07');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const rowB = rows.find((r) => r.department === 'M77_TEST_B')!;
    expect(rowB.dddsPer100).toBe(3);
  });

  it('科室按 DDDs 降序', async () => {
    const low = await submitView(admin, { month: '2026-08', department: 'M77_LOW', dddsTotal: 10, inpatientDays: 1000 });
    const high = await submitView(admin, { month: '2026-08', department: 'M77_HIGH', dddsTotal: 90, inpatientDays: 1000 });
    cleanup.push(low.id, high.id);
    const rows = await dashboardView(admin, '2026-08');
    const depts = rows.map((r) => r.department);
    expect(depts.indexOf('M77_HIGH')).toBeLessThan(depts.indexOf('M77_LOW'));
  });

  it('越权（self）-> 403', async () => {
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000077', dataScope: 'self' };
    let code = 200;
    try { await dashboardView(outsider, '2026-07'); }
    catch (e) { code = e instanceof AmDashError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await dashboardView(noPerm, '2026-07'); }
    catch (e) { code = e instanceof AmDashError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
