/**
 * 健澜科技 jlmedaios - 危急值闭环 Repository 集成测试（M3-F）
 *
 * 直连 PostgreSQL（本地库可用时跑）：
 *  - 扫描上报幂等：重复扫描不产生重复告警；
 *  - 状态机：raised -> acked -> resolved，非法跳转返回 null。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { getDb, verifyDbConnection, closeDbForTest } from '../../src/db/pool.js';
import {
  scanAndRaise,
  listAlerts,
  setStatus,
  countAlerts,
} from '../../src/db/repositories/criticalValueRepo.js';

let dbAvailable = false;
let testUserId = '';

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
  const db = getDb();
  const admin = await db`SELECT id FROM iam.users WHERE username = 'admin' LIMIT 1`;
  testUserId = String(admin[0].id);
} catch {
  dbAvailable = false;
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.critical_value_alerts`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-F CriticalValue Repository', () => {
  it('扫描上报：产生告警，重复扫描不重复', async () => {
    const first = await scanAndRaise();
    expect(first.length).toBeGreaterThan(0);
    const totalAfterFirst = await countAlerts();
    const second = await scanAndRaise();
    expect(second.length).toBe(0); // 幂等：已有告警的危急值不再重复上报
    expect(await countAlerts()).toBe(totalAfterFirst);
  });

  it('状态机：raised -> acked -> resolved，非法跳转拒绝', async () => {
    const db = getDb();
    const all = await listAlerts(null);
    expect(all.length).toBeGreaterThan(0);
    const id = all[0].id;

    // raised 直接 resolved 应拒绝（须先签收）
    const jump = await setStatus(id, ['acked'], 'resolved', { resolvedBy: testUserId, dispositionNote: 'x' }, db);
    expect(jump).toBeNull();

    const acked = await setStatus(id, ['raised'], 'acked', { ackedBy: testUserId }, db);
    expect(acked?.status).toBe('acked');

    const resolved = await setStatus(id, ['acked'], 'resolved', { resolvedBy: testUserId, dispositionNote: '已复查心电图' }, db);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.dispositionNote).toBe('已复查心电图');

    // resolved 再签收应拒绝
    const again = await setStatus(id, ['raised'], 'acked', { ackedBy: testUserId }, db);
    expect(again).toBeNull();
  });
});
