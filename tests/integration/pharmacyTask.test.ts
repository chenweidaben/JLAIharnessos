/**
 * 健澜科技 jlmedaios - 配药任务集成测试（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listPendingTasksView, RenewalError } from '../../src/bff/aggregators/renewalFlowAggregator.js';

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

D('配药任务（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('pharmacy:dispense');
  });
  it('pending 列表 200', async () => {
    const r = await listPendingTasksView(admin);
    expect(Array.isArray(r)).toBe(true);
  });
  it('任务不存在 404', async () => {
    try {
      const { completeTaskView } = await import('../../src/bff/aggregators/renewalFlowAggregator.js');
      await completeTaskView(admin, crypto.randomUUID());
      throw new Error('应抛错');
    } catch (e) {
      expect((e as RenewalError).status).toBe(404);
    }
  });
});
