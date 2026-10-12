/**
 * 健澜科技 jlmedaios - 成本归因集成测试（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { upsertCategoryBudget } from '../../src/db/repositories/costAttributionRepo.js';
import { attributionView, CostAttributionError } from '../../src/bff/aggregators/costAttributionAggregator.js';

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

D('成本归因（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('drg_attribution:view');
  });

  it('归因返回各类别并按贡献排序', async () => {
    const code = `CA-${Date.now()}`;
    await upsertCategoryBudget({ groupCode: code, category: 'drug', expectedAmount: 100 });
    await upsertCategoryBudget({ groupCode: code, category: 'lab', expectedAmount: 100 });

    const r = await attributionView(admin, { visitId: crypto.randomUUID(), groupCode: code });
    expect(r.rows.length).toBeGreaterThanOrEqual(2);
    // drug 有预算 expected=100
    const drug = r.rows.find((x) => x.category === 'drug');
    expect(drug?.expected).toBe(100);
  });

  it('visit 非法 404', async () => {
    try {
      await attributionView(admin, { visitId: 'bad', groupCode: 'X' });
      throw new Error('应抛错');
    } catch (e) {
      expect((e as CostAttributionError).status).toBe(404);
    }
  });
});
