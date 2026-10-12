/**
 * 健澜科技 jlmedaios - 整改效果回看集成测试（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createFromAttributionView, transitionView } from '../../src/bff/aggregators/improvementTaskAggregator.js';
import { evaluateView, ImprovementOutcomeError } from '../../src/bff/aggregators/improvementOutcomeAggregator.js';

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

D('整改效果回看（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('improvement_outcome:view');
  });

  it('evaluate 后 verdict 落库且幂等', async () => {
    // 建单并闭环到 closed
    const t = await createFromAttributionView(admin, { title: `OC-${Date.now()}`, finding: 'X', assigneeId: admin.id });
    await transitionView(admin, t.id, 'accepted');
    await transitionView(admin, t.id, 'in_progress');
    await transitionView(admin, t.id, 'resolved', 'done');
    await transitionView(admin, t.id, 'verified');
    await transitionView(admin, t.id, 'closed');

    // evaluate: baseline 0.5 → followup 0.1 = effective
    const r = await evaluateView(admin, t.id, { baselineVisits: 10, baselineOverspendRate: 0.5, followupVisits: 8, followupOverspendRate: 0.1 });
    expect(r.verdict).toBe('effective');

    // 重复 evaluate 幂等（同 task 一行）
    const r2 = await evaluateView(admin, t.id, { baselineVisits: 10, baselineOverspendRate: 0.5, followupVisits: 8, followupOverspendRate: 0.2 });
    expect(r2.taskId).toBe(t.id);
  });

  it('未关闭任务 evaluate 400', async () => {
    const t = await createFromAttributionView(admin, { title: 'OC2', finding: 'Y', assigneeId: admin.id });
    try {
      await evaluateView(admin, t.id, {});
      throw new Error('应抛错');
    } catch (e) {
      expect((e as ImprovementOutcomeError).status).toBe(400);
    }
  });

  it('任务不存在 404', async () => {
    try {
      await evaluateView(admin, crypto.randomUUID(), {});
      throw new Error('应抛错');
    } catch (e) {
      expect((e as ImprovementOutcomeError).status).toBe(404);
    }
  });
});
