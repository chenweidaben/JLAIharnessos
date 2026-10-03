/**
 * 健澜科技 jlmedaios - 危急值实时事件闭环集成测试（M7-B）
 *
 * 直连 PostgreSQL（本地库可用时跑），验证：
 *  - 扫描产生新告警后通过 WebSocket 实时推送 critical:alert（payload 含稳定 id）；
 *  - 重复扫描不重复推送；
 *  - 医师签收后广播 critical:status=acked；
 *  - 处置闭环后广播 critical:status=resolved。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { getDb, verifyDbConnection, closeDbForTest } from '../../src/db/pool.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  scanCritical,
  listQueue,
  ackAlert,
  resolveAlert,
} from '../../src/bff/aggregators/criticalValueAggregator.js';
import { setCriticalAlertSink } from '../../src/bff/alertBus.js';

let dbAvailable = false;
let admin: AuthView | null = null;

const captured: { event: string; payload: Record<string, unknown> }[] = [];

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
  const db = getDb();
  // 从干净状态开始，避免历史告警干扰计数
  await db`DELETE FROM clinical.critical_value_alerts`;
  const user = await getUserByUsername('admin');
  if (user) {
    admin = buildAuthView(user, await getUserRoleLinks(user.id));
  }
} catch {
  dbAvailable = false;
}

if (dbAvailable) {
  setCriticalAlertSink((event, payload) => {
    captured.push({ event, payload: payload as Record<string, unknown> });
  });
}

afterAll(async () => {
  setCriticalAlertSink(null);
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.critical_value_alerts`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M7-B 危急值实时事件闭环', () => {
  it('扫描产生新告警：实时推送 critical:alert，payload 含稳定 id', async () => {
    captured.length = 0;
    const { raised } = await scanCritical();
    expect(raised).toBeGreaterThan(0);
    // 每条新告警都推送了一条 critical:alert
    const alerts = captured.filter((c) => c.event === 'critical:alert');
    expect(alerts.length).toBe(raised);
    // payload 对齐前端 Alert 契约、id 非空且稳定
    for (const a of alerts) {
      expect(a.payload.id).toBeTruthy();
      expect(a.payload.type).toBe('critical-value');
      expect(a.payload.title).toBeTruthy();
      expect(a.payload.content).toBeTruthy();
    }
  });

  it('重复扫描不产生新告警、不重复推送（幂等）', async () => {
    captured.length = 0;
    const { raised } = await scanCritical();
    expect(raised).toBe(0);
    const alerts = captured.filter((c) => c.event === 'critical:alert');
    expect(alerts.length).toBe(0);
  });

  it('签收后广播 critical:status=acked', async () => {
    const queue = await listQueue(admin as AuthView, 'raised');
    expect(queue.length).toBeGreaterThan(0);
    const target = queue[0];
    captured.length = 0;
    const acked = await ackAlert(target.id, admin as AuthView);
    expect(acked.status).toBe('acked');
    const statusEvts = captured.filter((c) => c.event === 'critical:status');
    expect(statusEvts.length).toBe(1);
    expect(statusEvts[0].payload.id).toBe(target.id);
    expect(statusEvts[0].payload.status).toBe('acked');
  });

  it('处置闭环后广播 critical:status=resolved 并带 note', async () => {
    const queue = await listQueue(admin as AuthView, 'acked');
    expect(queue.length).toBeGreaterThan(0);
    const target = queue[0];
    captured.length = 0;
    const resolved = await resolveAlert(target.id, admin as AuthView, '已复查心电图并登记');
    expect(resolved.status).toBe('resolved');
    const statusEvts = captured.filter((c) => c.event === 'critical:status');
    expect(statusEvts.length).toBe(1);
    expect(statusEvts[0].payload.id).toBe(target.id);
    expect(statusEvts[0].payload.status).toBe('resolved');
    expect(statusEvts[0].payload.note).toBe('已复查心电图并登记');
  });
});
