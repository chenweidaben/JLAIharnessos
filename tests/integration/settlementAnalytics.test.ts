/**
 * 健澜科技 jlmedaios - 结算分析集成测试（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { computeView as computeReport } from '../../src/bff/aggregators/settlementReportAggregator.js';
import { analyticsView } from '../../src/bff/aggregators/settlementAnalyticsAggregator.js';

let dbAvailable = false;
let admin: AuthView;

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => { if (dbAvailable) await closeDbForTest(); });
const D = dbAvailable ? describe : describe.skip;

D('结算分析（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('settlement_analytics:view');
  });

  it('分析返回近 N 期且含环比/占比字段', async () => {
    await computeReport(admin, '2099-10');
    const a = await analyticsView(admin, 12);
    expect(Array.isArray(a)).toBe(true);
    const arr = Array.isArray(a) ? (a as any[]) : [];
    const last = arr[arr.length - 1];
    expect(last.period).toBe('2099-10');
    expect(last).toHaveProperty('settlementMoM');
    expect(last).toHaveProperty('drgRatio');
    expect(last).toHaveProperty('dipRatio');
  });
});
