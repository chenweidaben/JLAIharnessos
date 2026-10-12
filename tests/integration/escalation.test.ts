/**
 * 健澜科技 jlmedaios - 整改升级集成测试（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createFromAttributionView, transitionView } from '../../src/bff/aggregators/improvementTaskAggregator.js';
import { evaluateView } from '../../src/bff/aggregators/improvementOutcomeAggregator.js';
import { getChain, getLatestEscalation } from '../../src/db/repositories/escalationRepo.js';

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

D('整改升级（真实 PG）', () => {
  async function closeTask(): Promise<string> {
    const t = await createFromAttributionView(admin, { title: `ESC-${Date.now()}`, finding: 'X', assigneeId: admin.id });
    await transitionView(admin, t.id, 'accepted');
    await transitionView(admin, t.id, 'in_progress');
    await transitionView(admin, t.id, 'resolved', 'done');
    await transitionView(admin, t.id, 'verified');
    await transitionView(admin, t.id, 'closed');
    return t.id;
  }

  it('worse 后自动建二级升级单且幂等', async () => {
    const t = await closeTask();
    // baseline 0.5 → followup 0.6 = worse
    const r = await evaluateView(admin, t, { baselineOverspendRate: 0.5, followupOverspendRate: 0.6 });
    expect(r.review.verdict).toBe('worse');
    expect(r.escalated).not.toBeNull();
    expect(r.escalated!.escalationLevel).toBe(2);

    // 重复 evaluate 幂等：不重复建
    const r2 = await evaluateView(admin, t, { baselineOverspendRate: 0.5, followupOverspendRate: 0.6 });
    expect(r2.escalated).toBeNull();

    // 升级链含原单+升级单
    const chain = await getChain(t);
    expect(chain.length).toBe(2);
  });

  it('effective 不升级', async () => {
    const t = await closeTask();
    const r = await evaluateView(admin, t, { baselineOverspendRate: 0.5, followupOverspendRate: 0.1 });
    expect(r.review.verdict).toBe('effective');
    expect(r.escalated).toBeNull();
    const esc = await getLatestEscalation(t);
    expect(esc).toBeNull();
  });
});
