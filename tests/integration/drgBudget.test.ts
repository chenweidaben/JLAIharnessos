/**
 * 健澜科技 jlmedaios - DRG 预算集成测试（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { ackAlertView, DrgBudgetError, evaluateVisitView, listAlertsView, upsertBudgetView } from '../../src/bff/aggregators/drgBudgetAggregator.js';

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

D('DRG 预算（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('drg_budget:manage');
    expect(admin.permissions).toContain('drg_budget:view');
  });

  it('设预算+超支建告警+确认', async () => {
    const code = `TG-${Date.now()}`;
    await upsertBudgetView(admin, { groupCode: code, expectedCost: 100 });

    // 实际 130% → over
    const r = await evaluateVisitView(admin, { visitId: crypto.randomUUID(), groupCode: code, actualCost: 130 });
    expect(r.alert?.level).toBe('over');

    // 列未确认
    const list = await listAlertsView(admin, true);
    expect(list.length).toBeGreaterThanOrEqual(1);

    // 确认
    const acked = await ackAlertView(admin, r.alert!.id);
    expect(acked.acknowledged).toBe(true);

    // 重复确认 409
    try {
      await ackAlertView(admin, r.alert!.id);
      throw new Error('应抛错');
    } catch (e) {
      expect((e as DrgBudgetError).status).toBe(409);
    }
  });
});
