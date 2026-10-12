/**
 * 健澜科技 jlmedaios - 月度结算报表集成测试（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { evaluateView as evaluateSelection } from '../../src/bff/aggregators/paymentSelectionAggregator.js';
import {
  computeView,
  exportCsvView,
  SettlementReportError,
} from '../../src/bff/aggregators/settlementReportAggregator.js';

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

D('月度结算报表（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('settlement_report:view');
  });

  it('计算汇总落库', async () => {
    await evaluateSelection(admin, crypto.randomUUID(), { drgExpectedPayment: 3000, dipScore: 10, dipPointValue: 200 });
    const r = await computeView(admin, '2099-04');
    expect(r.period).toBe('2099-04');
    expect(r.insuranceSettlement).toBeGreaterThan(0);
  });

  it('重复算同月覆盖', async () => {
    const r = await computeView(admin, '2099-05');
    const r2 = await computeView(admin, '2099-05');
    expect(r.id).toBe(r2.id); // upsert 同 period
  });

  it('CSV 导出含表头与行数', async () => {
    await computeView(admin, '2099-06');
    const csv = await exportCsvView(admin, '2099-06');
    expect(csv).toMatch(/period,drg_cases/);
    expect(csv.split('\n').filter((l) => l.length > 0).length).toBe(2);
  });

  it('period 格式错 400', async () => {
    try {
      await computeView(admin, 'bad');
      throw new Error('应抛错');
    } catch (e) {
      expect((e as SettlementReportError).status).toBe(400);
    }
  });
});
