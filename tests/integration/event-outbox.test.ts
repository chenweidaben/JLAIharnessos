/**
 * 健澜科技 jlmedaios - 事务性发件箱 Repository 集成测试（M7-C）
 *
 * 直连 PostgreSQL（本地库可用时跑），验证 at-least-once 状态机：
 *  - appendEvent 写入 pending；
 *  - claimBatch 认领（pending -> processing，FOR UPDATE SKIP LOCKED）；
 *  - markPublished（processing -> published）；
 *  - resetToPending（processing -> pending，attempts+1）；
 *  - reclaimStale（processing 超时回收）；
 *  - listByAggregate / countByStatus。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import {
  getDb,
  verifyDbConnection,
  closeDbForTest,
  withTx,
} from '../../src/db/pool.js';
import {
  appendEvent,
  claimBatch,
  markPublished,
  markDead,
  resetToPending,
  reclaimStale,
  listByAggregate,
  listDeadLetters,
  requeueDeadLetter,
  countByStatus,
  oldestPendingAgeSeconds,
} from '../../src/db/repositories/outboxRepo.js';

let dbAvailable = false;
try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.event_outbox WHERE aggregate_type = 'test_outbox'`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M7-C 事务性发件箱状态机', () => {
  it('appendEvent 写入 pending 事件并可按状态统计', async () => {
    const before = await countByStatus();
    await withTx(async (tx) => {
      await appendEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: 'test:event',
          aggregateType: 'test_outbox',
          aggregateId: 'agg-1',
          payload: { hello: 'world', n: 1 },
        },
        tx,
      );
    });
    const after = await countByStatus();
    expect(after.pending).toBe(before.pending + 1);
  });

  it('claimBatch 认领 pending -> processing，payload 正确反序列化', async () => {
    const claimed = await withTx((tx) => claimBatch(10, tx));
    const mine = claimed.filter((e) => e.aggregateType === 'test_outbox');
    expect(mine.length).toBeGreaterThan(0);
    const e = mine[mine.length - 1];
    expect(e.status).toBe('processing');
    expect(e.lockedAt).toBeTruthy();
    expect((e.payload as Record<string, unknown>).hello).toBe('world');
    // 认领后再次 claim（同事务外）不应得到已 processing 的
    const again = await withTx((tx) => claimBatch(10, tx));
    expect(again.some((x) => x.id === e.id)).toBe(false);
  });

  it('markPublished：processing -> published', async () => {
    // 写一条并认领
    const eid = crypto.randomUUID();
    await withTx(async (tx) => {
      await appendEvent(
        { eventId: eid, eventType: 'test:pub', aggregateType: 'test_outbox', aggregateId: 'agg-3', payload: {} },
        tx,
      );
    });
    const claimed = await withTx(async (tx) => {
      const c = await claimBatch(10, tx);
      return c.filter((e) => e.eventId === eid);
    });
    await markPublished(claimed.map((e) => e.id));
    const history = await listByAggregate('test_outbox', 'agg-3');
    expect(history[0].status).toBe('published');
    expect(history[0].publishedAt).toBeTruthy();
  });

  it('resetToPending：processing -> pending，attempts+1', async () => {
    const eid = crypto.randomUUID();
    await withTx(async (tx) => {
      await appendEvent(
        { eventId: eid, eventType: 'test:retry', aggregateType: 'test_outbox', aggregateId: 'agg-4', payload: {} },
        tx,
      );
    });
    const claimed = await withTx(async (tx) => {
      const c = await claimBatch(10, tx);
      return c.filter((e) => e.eventId === eid);
    });
    await resetToPending(claimed.map((e) => e.id));
    const history = await listByAggregate('test_outbox', 'agg-4');
    expect(history[0].status).toBe('pending');
    expect(history[0].attempts).toBe(1);
    expect(history[0].lockedAt).toBeNull();
  });

  it('reclaimStale：processing 超时回收为 pending', async () => {
    const eid = crypto.randomUUID();
    await withTx(async (tx) => {
      await appendEvent(
        { eventId: eid, eventType: 'test:stale', aggregateType: 'test_outbox', aggregateId: 'agg-5', payload: {} },
        tx,
      );
    });
    await withTx(async (tx) => claimBatch(10, tx));
    // 把 locked_at 手动改到 2 分钟前
    const db = getDb();
    await db`UPDATE clinical.event_outbox SET locked_at = now() - interval '2 minutes' WHERE event_id = ${eid}`;
    const reclaimed = await reclaimStale(60_000);
    expect(reclaimed).toBeGreaterThan(0);
    const history = await listByAggregate('test_outbox', 'agg-5');
    expect(history[0].status).toBe('pending');
  });

  it('listByAggregate 仅返回该聚合的事件', async () => {
    const history = await listByAggregate('test_outbox', 'agg-1');
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((e) => e.aggregateId === 'agg-1')).toBe(true);
  });

  it('M7-D markDead：processing -> dead，记录最后错误与死信时间', async () => {
    const eid = crypto.randomUUID();
    await withTx(async (tx) => {
      await appendEvent(
        { eventId: eid, eventType: 'test:dead', aggregateType: 'test_outbox', aggregateId: 'agg-6', payload: {} },
        tx,
      );
    });
    const claimed = await withTx(async (tx) => {
      const c = await claimBatch(10, tx);
      return c.filter((e) => e.eventId === eid);
    });
    await markDead(claimed.map((e) => e.id), 'publish failed: 永久错误');
    const history = await listByAggregate('test_outbox', 'agg-6');
    expect(history[0].status).toBe('dead');
    expect(history[0].lastError).toBe('publish failed: 永久错误');
    expect(history[0].deadAt).toBeTruthy();
    expect(history[0].attempts).toBe(1);
  });

  it('M7-D listDeadLetters：分页返回死信并给总数', async () => {
    const { items, total } = await listDeadLetters(10, 0);
    const mine = items.filter((e) => e.aggregateType === 'test_outbox');
    expect(mine.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThanOrEqual(mine.length);
    // 分页：offset 超出后不返回
    const page2 = await listDeadLetters(10, total + 50);
    expect(page2.items.length).toBe(0);
  });

  it('M7-D requeueDeadLetter：dead -> pending，清空错误/死信时间/attempts', async () => {
    const history = await listByAggregate('test_outbox', 'agg-6');
    const id = history[0].id;
    const ok = await requeueDeadLetter(id);
    expect(ok).toBe(true);
    const after = await listByAggregate('test_outbox', 'agg-6');
    expect(after[0].status).toBe('pending');
    expect(after[0].lastError).toBeNull();
    expect(after[0].deadAt).toBeNull();
    expect(after[0].attempts).toBe(0);
    // 非 dead 再次重投返回 false
    expect(await requeueDeadLetter(id)).toBe(false);
  });

  it('M7-D oldestPendingAgeSeconds：返回非负年龄（无 pending 为 0）', async () => {
    const age = await oldestPendingAgeSeconds();
    expect(age).toBeGreaterThanOrEqual(0);
  });
});
