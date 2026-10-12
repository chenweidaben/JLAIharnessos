/**
 * 健澜科技 jlmedaios - DIP 集成测试（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  calculatePointView,
  createPacketView,
  DipError,
  listPacketsView,
  settleView,
} from '../../src/bff/aggregators/dipAggregator.js';

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

D('DIP（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('dip:manage');
    expect(admin.permissions).toContain('dip:view');
  });

  it('建分值→算点值→settle=score×pointValue', async () => {
    const code = `DIP-${Date.now()}`;
    await createPacketView(admin, { packetCode: code, packetName: 'X', score: 10 });
    const mp = await calculatePointView(admin, { period: '2099-01', fundPool: 1_000_000, totalScore: 5000 });
    expect(mp.pointValue).toBeCloseTo(200);

    const s = await settleView(admin, { packetCode: code, period: '2099-01' });
    expect(s.settleAmount).toBeCloseTo(2000);
  });

  it('totalScore=0 时点值=0', async () => {
    const mp = await calculatePointView(admin, { period: '2099-02', fundPool: 1_000_000, totalScore: 0 });
    expect(mp.pointValue).toBe(0);
  });

  it('重复算同月覆盖', async () => {
    await calculatePointView(admin, { period: '2099-03', fundPool: 1_000_000, totalScore: 5000 });
    const mp = await calculatePointView(admin, { period: '2099-03', fundPool: 2_000_000, totalScore: 5000 });
    expect(mp.pointValue).toBeCloseTo(400);
  });

  it('settle 病种未找到 400', async () => {
    try {
      await settleView(admin, { packetCode: 'NOPE', period: '2099-01' });
      throw new Error('应抛错');
    } catch (e) {
      expect((e as DipError).status).toBe(400);
    }
  });

  it('列表可查', async () => {
    const list = await listPacketsView(admin);
    expect(Array.isArray(list)).toBe(true);
  });
});
