/**
 * 健澜科技 jlmedaios - DIP 接入事中监控集成测试（M23-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { upsertSelection } from '../../src/db/repositories/paymentSelectionRepo.js';
import { refreshVisitView, listWardView, InpatientCostError } from '../../src/bff/aggregators/inpatientCostMonitorAggregator.js';
import { getByVisit as getMonitor } from '../../src/db/repositories/inpatientCostMonitorRepo.js';

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

D('M23-F DIP 事中监控（真实 PG）', () => {
  it('DIP visit refresh 后 budget_basis=dip 且预算=score×点值', async () => {
    const visitId = crypto.randomUUID();
    await upsertSelection({ visitId, drgGroupCode: null, drgExpectedPayment: null, dipPacketCode: 'P1', dipScore: 10, dipPointValue: 200, selectedPath: 'auto_dip' });
    await refreshVisitView(admin, { visitId, groupCode: 'P1', accumulatedCost: 500 });
    const m = await getMonitor(visitId);
    expect(m?.budgetBasis).toBe('dip');
    expect(Number(m?.budgetCost)).toBe(2000);
  });

  it('DRG visit budget_basis=drg', async () => {
    const visitId = crypto.randomUUID();
    await upsertSelection({ visitId, drgGroupCode: 'DRG1', drgExpectedPayment: 3000, dipPacketCode: null, dipScore: null, dipPointValue: null, selectedPath: 'auto_drg' });
    await refreshVisitView(admin, { visitId, groupCode: 'DRG1', accumulatedCost: 100 });
    const m = await getMonitor(visitId);
    expect(m?.budgetBasis).toBe('drg');
  });

  it('listWard 返回 basis 徽标', async () => {
    const rows = await listWardView(admin);
    expect(Array.isArray(rows)).toBe(true);
    for (const r of rows) expect(['drg', 'dip']).toContain(r.budgetBasis);
  });

  it('越权 403', async () => {
    const fake: AuthView = { ...admin, permissions: [] };
    try {
      await listWardView(fake);
      throw new Error('应抛错');
    } catch (e) {
      expect((e as InpatientCostError).status).toBe(403);
    }
  });
});
