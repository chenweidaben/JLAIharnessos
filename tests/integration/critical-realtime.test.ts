/**
 * 健澜科技 jlmedaios - 危急值实时事件闭环集成测试（M7-B / M7-C）
 *
 * 直连 PostgreSQL（本地库可用时跑），验证：
 *  - 扫描产生新告警后，业务事务内将 critical:alert 写入 event_outbox（持久化、必发）；
 *  - OutboxRelay 轮询发布到 WebSocket（publisher 收集），payload 含稳定 id；
 *  - 重复扫描不产生新告警、不重复发布；
 *  - 医师签收/处置后，critical:status 经 outbox 发布（acked/resolved + note）。
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
import { OutboxRelay } from '../../src/bff/outboxRelay.js';
import { countByStatus } from '../../src/db/repositories/outboxRepo.js';

let dbAvailable = false;
let admin: AuthView | null = null;

const captured: { event: string; payload: Record<string, unknown> }[] = [];

/** 等待 captured 中匹配事件达到期望数量（Relay 异步轮询）。 */
async function waitForCaptured(
  event: string,
  expected: number,
  timeoutMs = 4000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (captured.filter((c) => c.event === event).length >= expected) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  const got = captured.filter((c) => c.event === event).length;
  expect(got).toBe(expected);
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
  const db = getDb();
  // 从干净状态开始，避免历史告警/事件干扰计数
  await db`DELETE FROM clinical.critical_value_alerts`;
  await db`DELETE FROM clinical.event_outbox`;
  const user = await getUserByUsername('admin');
  if (user) {
    admin = buildAuthView(user, await getUserRoleLinks(user.id));
  }
} catch {
  dbAvailable = false;
}

// M7-C：真实 Relay，publisher 收集发布的事件（替代 WS broadcast）
const relay = new OutboxRelay(
  (event, payload) => {
    captured.push({ event, payload: payload as Record<string, unknown> });
  },
  { batchSize: 100, pollIntervalMs: 100 },
);
if (dbAvailable) relay.start();

afterAll(async () => {
  relay.stop();
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.critical_value_alerts`;
    await db`DELETE FROM clinical.event_outbox`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M7-B/C 危急值实时事件闭环（事务性发件箱）', () => {
  it('扫描产生新告警：事件写入 outbox 并经 Relay 发布 critical:alert', async () => {
    captured.length = 0;
    const { raised } = await scanCritical();
    expect(raised).toBeGreaterThan(0);
    // 事件持久化：outbox 中 published 事件数（Relay 已标记）
    await waitForCaptured('critical:alert', raised);
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

  it('重复扫描不产生新告警、不重复发布（幂等）', async () => {
    captured.length = 0;
    const { raised } = await scanCritical();
    expect(raised).toBe(0);
    // 给 Relay 一个轮询周期，确认无新事件发布
    await new Promise((r) => setTimeout(r, 400));
    expect(captured.filter((c) => c.event === 'critical:alert').length).toBe(0);
  });

  it('签收后 critical:status=acked 经 outbox 发布', async () => {
    const queue = await listQueue(admin as AuthView, 'raised');
    expect(queue.length).toBeGreaterThan(0);
    const target = queue[0];
    captured.length = 0;
    const acked = await ackAlert(target.id, admin as AuthView);
    expect(acked.status).toBe('acked');
    await waitForCaptured('critical:status', 1);
    const statusEvts = captured.filter((c) => c.event === 'critical:status');
    expect(statusEvts[0].payload.id).toBe(target.id);
    expect(statusEvts[0].payload.status).toBe('acked');
  });

  it('处置闭环后 critical:status=resolved 经 outbox 发布并带 note', async () => {
    const queue = await listQueue(admin as AuthView, 'acked');
    expect(queue.length).toBeGreaterThan(0);
    const target = queue[0];
    captured.length = 0;
    const resolved = await resolveAlert(target.id, admin as AuthView, '已复查心电图并登记');
    expect(resolved.status).toBe('resolved');
    await waitForCaptured('critical:status', 1);
    const statusEvts = captured.filter((c) => c.event === 'critical:status');
    expect(statusEvts[0].payload.id).toBe(target.id);
    expect(statusEvts[0].payload.status).toBe('resolved');
    expect(statusEvts[0].payload.note).toBe('已复查心电图并登记');
  });

  it('所有事件均经 outbox 持久化（无内存直推）', async () => {
    const counts = await countByStatus();
    // critical:alert + 两次 critical:status 均已发布
    expect(counts.published).toBeGreaterThan(0);
    expect(counts.pending).toBe(0);
  });
});
