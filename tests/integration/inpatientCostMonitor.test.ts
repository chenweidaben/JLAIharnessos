/**
 * 健澜科技 jlmedaios - 在院费用监控集成测试（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { upsertBudget } from '../../src/db/repositories/drgBudgetRepo.js';
import {
  dischargeReviewView,
  InpatientCostError,
  listWardView,
  refreshVisitView,
} from '../../src/bff/aggregators/inpatientCostMonitorAggregator.js';

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

D('在院费用监控（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('inpatient_cost:view');
  });

  it('refresh+list+出院提醒幂等+ok不提醒', async () => {
    const code = `IC-${Date.now()}`;
    await upsertBudget({ groupCode: code, expectedCost: 100 });

    // 累计 130% → over
    const v = crypto.randomUUID();
    const r = await refreshVisitView(admin, { visitId: v, groupCode: code, accumulatedCost: 130 });
    expect(r.level).toBe('over');
    expect(Number(r.ratio)).toBeCloseTo(1.3);

    // list 含红黄
    const list = await listWardView(admin);
    expect(list.length).toBeGreaterThanOrEqual(1);

    // 出院提醒：首次 true
    const d1 = await dischargeReviewView(admin, v);
    expect(d1.discharged).toBe(true);
    // 幂等：第二次 already_reminded
    const d2 = await dischargeReviewView(admin, v);
    expect(d2.discharged).toBe(false);
    expect(d2.reason).toBe('already_reminded');

    // ok 级不提醒
    const v2 = crypto.randomUUID();
    await refreshVisitView(admin, { visitId: v2, groupCode: code, accumulatedCost: 50 });
    const d3 = await dischargeReviewView(admin, v2);
    expect(d3.discharged).toBe(false);
    expect(d3.reason).toBe('level_ok');
  });

  it('visit 不存在 404', async () => {
    try {
      await dischargeReviewView(admin, crypto.randomUUID());
      throw new Error('应抛错');
    } catch (e) {
      expect((e as InpatientCostError).status).toBe(404);
    }
  });
});
