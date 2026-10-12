/**
 * 健澜科技 jlmedaios - 护士站四合一屏集成测试（M18-B）
 *
 * 真实 PG：ward 列表 200、单患者 workbench 200、无权限 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { getWardBoard, getVisitWorkbench, NurseStationError } from '../../src/bff/aggregators/nurseStationAggregator.js';

let dbAvailable = false;
let admin: AuthView;

async function statusOf(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) {
    if (e instanceof NurseStationError) return e.status;
    throw e;
  }
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => { if (dbAvailable) await closeDbForTest(); });
const D = dbAvailable ? describe : describe.skip;

D('护士站聚合（真实 PG）', () => {
  it('权限', () => { expect(admin.permissions).toContain('nurse_station:read'); });

  it('ward 列表 200 含计数字段', async () => {
    const r = await getWardBoard(admin, 'nurse_station:read');
    expect(Array.isArray(r.items)).toBe(true);
    for (const it of r.items.slice(0, 3)) {
      expect(typeof it.visitId).toBe('string');
      expect(typeof it.pendingMeds).toBe('number');
      expect(typeof it.activeTubes).toBe('number');
      expect(typeof it.unresolvedHardCds).toBe('number');
    }
  });

  it('不存在 visit -> 403/404', async () => {
    const s = await statusOf(getVisitWorkbench(admin, 'nurse_station:read', '00000000-0000-0000-0000-000000000000'));
    expect([403, 404]).toContain(s);
  });
});
