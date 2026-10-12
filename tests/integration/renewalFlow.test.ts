/**
 * 健澜科技 jlmedaios - 续方流转集成测试（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { dispenseView, payView, prescribeView, RenewalError } from '../../src/bff/aggregators/renewalFlowAggregator.js';

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

D('续方流转（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('renewal:prescribe');
    expect(admin.permissions).toContain('renewal:pay');
  });

  it('会话未完成续方 400', async () => {
    try {
      await prescribeView(admin, {
        sessionId: crypto.randomUUID(), patientId: crypto.randomUUID(),
        accountId: crypto.randomUUID(), profileId: crypto.randomUUID(),
        rxNo: `RX-${Date.now()}`, idempotencyKey: `k-${Date.now()}`,
        sessionStatus: 'in_progress', hasPriorRx: true,
      });
      throw new Error('应抛错');
    } catch (e) {
      expect(e).toBeInstanceOf(RenewalError);
      expect((e as RenewalError).status).toBe(400);
    }
  });

  it('处方不存在 404', async () => {
    try {
      await payView(admin, crypto.randomUUID());
      throw new Error('应抛错');
    } catch (e) {
      expect((e as RenewalError).status).toBe(404);
    }
  });
});
