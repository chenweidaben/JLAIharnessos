/**
 * 健澜科技 jlmedaios - Outbox Relay 单元测试（M7-C）
 *
 * 用 mock 隔离数据库，手动驱动 runOnce（确定性、不依赖自动轮询），验证：
 *  - 认领 pending 后调用 publisher，成功标记 published；
 *  - publisher 抛错：触发 onPublishError，失败事件回滚 pending（下轮重试），
 *    成功事件仍标记 published；
 *  - 无事件时不调用 publisher；
 *  - start/stop 自动轮询与幂等。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, mock, beforeEach } from 'bun:test';

/** 模拟数据库事件（含状态） */
type Ev = { id: number; eventType: string; payload: unknown; status: string };
let events: Ev[] = [];
let markPublishedIds: number[][] = [];
let resetToPendingIds: number[][] = [];

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
    markPublishedIds.push(ids);
    events.filter((e) => ids.includes(e.id)).forEach((e) => (e.status = 'published'));
  },
  resetToPending: async (ids: number[]) => {
    resetToPendingIds.push(ids);
    events.filter((e) => ids.includes(e.id)).forEach((e) => (e.status = 'pending'));
  },
  reclaimStale: async () => 0,
}));

const { OutboxRelay } = await import('../../src/bff/outboxRelay.js');

function makeEvent(id: number, type: string, payload: unknown): Ev {
  return { id, eventType: type, payload, status: 'pending' };
}

beforeEach(() => {
  events = [];
  markPublishedIds = [];
  resetToPendingIds = [];
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
