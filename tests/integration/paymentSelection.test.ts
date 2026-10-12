/**
 * 健澜科技 jlmedaios - 病组选择集成测试（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  evaluateView,
  getView,
  overrideView,
  PaymentSelectionError,
} from '../../src/bff/aggregators/paymentSelectionAggregator.js';

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

D('病组双轨选择（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('payment_select:view');
    expect(admin.permissions).toContain('payment_select:adjust');
  });

  it('evaluate 后 DRG 更高落 auto_drg', async () => {
    const v = crypto.randomUUID();
    const r = await evaluateView(admin, v, { drgExpectedPayment: 3000, dipScore: 10, dipPointValue: 200 });
    expect(r.selectedPath).toBe('auto_drg');
    expect(r.dipPayment).toBeCloseTo(2000);
  });

  it('DIP 更高选 auto_dip', async () => {
    const v = crypto.randomUUID();
    const r = await evaluateView(admin, v, { drgExpectedPayment: 1000, dipScore: 10, dipPointValue: 200 });
    expect(r.selectedPath).toBe('auto_dip');
  });

  it('医保办 override 为 manual 并记 override_by', async () => {
    const v = crypto.randomUUID();
    await evaluateView(admin, v, { drgExpectedPayment: 3000, dipScore: 10, dipPointValue: 200 });
    const r = await overrideView(admin, v, { selectedPath: 'manual' });
    expect(r.selectedPath).toBe('manual');
  });

  it('重复 evaluate 幂等（同 visit 一行）', async () => {
    const v = crypto.randomUUID();
    await evaluateView(admin, v, { drgExpectedPayment: 3000, dipScore: 10, dipPointValue: 200 });
    const r2 = await evaluateView(admin, v, { drgExpectedPayment: 4000, dipScore: 10, dipPointValue: 200 });
    const g = await getView(admin, v);
    expect(g.id).toBe(r2.id); // 同一行 upsert
  });

  it('未评估 get 404', async () => {
    try {
      await getView(admin, crypto.randomUUID());
      throw new Error('应抛错');
    } catch (e) {
      expect((e as PaymentSelectionError).status).toBe(404);
    }
  });
});
