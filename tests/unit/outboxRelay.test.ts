/**
 * 健澜科技 jlmedaios - Outbox Relay 单元测试（M7-C/D）
 *
 * 用 mock 隔离数据库，手动驱动 runOnce（确定性、不依赖自动轮询），验证：
 *  - 认领 pending 后调用 publisher，成功标记 published；
 *  - publisher 抛错：触发 onPublishError，失败事件回滚 pending（下轮重试），
 *    成功事件仍标记 published；
 *  - 失败达到 maxAttempts：进入死信（markDead），触发 onDeadLetter，不再重试；
 *  - 无事件时不调用 publisher；
 *  - start/stop 自动轮询与幂等。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, mock, beforeEach } from 'bun:test';

/** 模拟数据库事件（含状态与尝试次数） */
type Ev = { id: number; eventType: string; payload: unknown; status: string; attempts: number };
let events: Ev[] = [];
let markPublishedIds: number[][] = [];
let resetToPendingIds: number[][] = [];
let markDead: { ids: number[]; error: string }[] = [];

mock.module('../../src/db/pool.js', () => ({
  withTx: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
}));

mock.module('../../src/db/repositories/outboxRepo.js', () => ({
  claimBatch: async () => {
    const out = events.filter((e) => e.status === 'pending');
    out.forEach((e) => (e.status = 'processing'));
    return out;
  },
  markPublished: async (ids: number[]) => {
    if (ids.length === 0) return;
    markPublishedIds.push(ids);
    events.filter((e) => ids.includes(e.id)).forEach((e) => (e.status = 'published'));
  },
  resetToPending: async (ids: number[]) => {
    if (ids.length === 0) return;
    resetToPendingIds.push(ids);
    events.filter((e) => ids.includes(e.id)).forEach((e) => {
      e.status = 'pending'; e.attempts += 1;
    });
  },
  markDead: async (ids: number[], error: string) => {
    if (ids.length === 0) return;
    markDead.push({ ids, error });
    events.filter((e) => ids.includes(e.id)).forEach((e) => {
      e.status = 'dead'; e.attempts += 1;
    });
  },
  reclaimStale: async () => 0,
  countByStatus: async () => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  },
  oldestPendingAgeSeconds: async () => 0,
}));

const { OutboxRelay } = await import('../../src/bff/outboxRelay.js');

function makeEvent(id: number, type: string, payload: unknown): Ev {
  return { id, eventType: type, payload, status: 'pending', attempts: 0 };
}

beforeEach(() => {
  events = [];
  markPublishedIds = [];
  resetToPendingIds = [];
  markDead = [];
});

describe('M7-C Outbox Relay（at-least-once）', () => {
  it('认领 pending：调用 publisher，成功标记 published', async () => {
    events = [makeEvent(1, 'critical:alert', { id: 'a1' }), makeEvent(2, 'critical:alert', { id: 'a2' })];
    const published: unknown[] = [];
    const relay = new OutboxRelay((type, payload) => { published.push({ type, payload }); });
    await relay.runOnce();
    expect(published.length).toBe(2);
    expect(published[0]).toEqual({ type: 'critical:alert', payload: { id: 'a1' } });
    expect(markPublishedIds[0]).toEqual([1, 2]);
    expect(events.every((e) => e.status === 'published')).toBe(true);
    expect(resetToPendingIds.every((x) => x.length === 0)).toBe(true);
  });

  it('publisher 抛错：onPublishError + 失败回滚 pending，成功仍 published', async () => {
    events = [makeEvent(1, 'critical:alert', { fail: true }), makeEvent(2, 'critical:alert', { ok: true })];
    const errors: number[] = [];
    const okPayloads: unknown[] = [];
    const relay = new OutboxRelay(
      (type, payload) => {
        if ((payload as { fail?: boolean }).fail) throw new Error('publish failed');
        okPayloads.push(payload);
      },
      { onPublishError: (ev) => errors.push(ev.id) },
    );
    await relay.runOnce();
    expect(errors).toEqual([1]);
    expect(okPayloads).toEqual([{ ok: true }]);
    expect(markPublishedIds[0]).toEqual([2]);
    expect(resetToPendingIds[0]).toEqual([1]);
    expect(events.find((e) => e.id === 1)?.status).toBe('pending');
    expect(events.find((e) => e.id === 2)?.status).toBe('published');
  });

  it('M7-D 失败达到 maxAttempts：进入死信，触发 onDeadLetter，不再重试', async () => {
    events = [makeEvent(1, 'critical:alert', { x: 1 })];
    const deadLetters: number[] = [];
    const publishErrors: number[] = [];
    let publishCalls = 0;
    const relay = new OutboxRelay(
      () => { publishCalls++; throw new Error('永久失败'); },
      {
        maxAttempts: 3,
        onPublishError: (ev) => publishErrors.push(ev.id),
        onDeadLetter: (ev) => deadLetters.push(ev.id),
      },
    );
    // 连续手动跑 3 轮
    for (let i = 0; i < 3; i++) {
      await relay.runOnce();
    }
    expect(publishCalls).toBe(3);
    // 前 2 次可重试，第 3 次进入死信
    expect(resetToPendingIds).toHaveLength(2);
    expect(resetToPendingIds[0]).toEqual([1]);
    expect(markDead).toHaveLength(1);
    expect(markDead[0].ids).toEqual([1]);
    expect(markDead[0].error).toBe('永久失败');
    expect(publishErrors).toHaveLength(2);
    expect(deadLetters).toEqual([1]);
    expect(events[0].status).toBe('dead');
    expect(events[0].attempts).toBe(3);
    // 死信后不再被认领（再跑一轮 publisher 不调用）
    const callsBefore = publishCalls;
    await relay.runOnce();
    expect(publishCalls).toBe(callsBefore);
  });

  it('无 pending 事件：不调用 publisher', async () => {
    let calls = 0;
    const relay = new OutboxRelay(() => { calls++; });
    await relay.runOnce();
    expect(calls).toBe(0);
  });

  it('start/stop：自动轮询发布，start 幂等、stop 后停止', async () => {
    events = [makeEvent(1, 'critical:alert', { x: 1 })];
    let calls = 0;
    const relay = new OutboxRelay(() => { calls++; }, { pollIntervalMs: 30 });
    relay.start();
    relay.start();
    // 等待首次发布
    const deadline = Date.now() + 1000;
    while (Date.now() < deadline && calls < 1) {
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(calls).toBe(1);
    relay.stop();
    const after = calls;
    await new Promise((r) => setTimeout(r, 150));
    expect(calls).toBe(after);
  });
});
