/**
 * 健澜科技 jlmedaios - 改进任务集成测试（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  createFromAttributionView,
  ImprovementError,
  transitionView,
} from '../../src/bff/aggregators/improvementTaskAggregator.js';

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

D('改进任务（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('improvement_task:assign');
    expect(admin.permissions).toContain('improvement_task:handle');
  });

  it('建单→认领→提交解决→验证闭环', async () => {
    const t = await createFromAttributionView(admin, {
      title: `超支-${Date.now()}`, finding: 'drug overspend',
      assigneeId: admin.id, category: 'drug',
    });
    expect(t.status).toBe('open');

    // 认领 open→accepted
    const a = await transitionView(admin, t.id, 'accepted');
    expect(a.status).toBe('accepted');

    // 提交解决 accepted→in_progress→resolved（先 in_progress）
    await transitionView(admin, t.id, 'in_progress');
    const r = await transitionView(admin, t.id, 'resolved', 'cut drug cost');
    expect(r.status).toBe('resolved');
    expect(r.resolutionNote).toBe('cut drug cost');

    // 质控验证 resolved→verified→closed
    await transitionView(admin, t.id, 'verified');
    const c = await transitionView(admin, t.id, 'closed');
    expect(c.status).toBe('closed');
  });

  it('非法跳转 409', async () => {
    const t = await createFromAttributionView(admin, { title: 'X', finding: 'Y', assigneeId: admin.id });
    try {
      await transitionView(admin, t.id, 'closed'); // open→closed 非法
      throw new Error('应抛错');
    } catch (e) {
      expect((e as ImprovementError).status).toBe(409);
    }
  });

  it('任务不存在 404', async () => {
    try {
      await transitionView(admin, crypto.randomUUID(), 'accepted');
      throw new Error('应抛错');
    } catch (e) {
      expect((e as ImprovementError).status).toBe(404);
    }
  });
});
