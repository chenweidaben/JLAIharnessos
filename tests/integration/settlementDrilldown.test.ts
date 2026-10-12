/**
 * 健澜科技 jlmedaios - 结算下钻集成测试（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { drilldownView, DrilldownError } from '../../src/bff/aggregators/settlementDrilldownAggregator.js';

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

D('结算下钻（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('settlement_drilldown:view');
  });

  it('返回 byDepartment+byDoctor', async () => {
    const r = await drilldownView(admin, '2099-10');
    expect(r).toHaveProperty('byDepartment');
    expect(r).toHaveProperty('byDoctor');
  });

  it('无权限 403', async () => {
    const fake: AuthView = { ...admin, permissions: [] };
    try {
      await drilldownView(fake, '2099-10');
      throw new Error('应抛错');
    } catch (e) {
      expect((e as DrilldownError).status).toBe(403);
    }
  });
});
