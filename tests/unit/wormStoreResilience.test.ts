/**
 * 健澜AI原生医院操作系统OS - P5-16 装饰层单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  createSemaphore,
  DEFAULT_MAX_IN_FLIGHT,
  DEFAULT_TIMEOUTS,
  withResilience,
  withTimeout,
  type ProbeableStore,
} from '../../src/bff/aggregators/wormStoreResilience.js';
import type { AsyncWormStore } from '../../src/bff/aggregators/wormStore.js';
import type { WormSegment } from '../../src/bff/aggregators/wormArchiveAggregator.js';

function fakeSegment(id: string, seq: number): WormSegment {
  return {
    segmentId: id,
    seq,
    events: [],
    segmentHash: 'x'.repeat(64),
    createdAt: '2026-01-01T00:00:00Z',
  } as unknown as WormSegment;
}

/** 用可控延迟构造 mock store */
function delayedStore(opts: {
  getMs?: number;
  putMs?: number;
  listMs?: number;
  probeExists?: boolean;
}): AsyncWormStore & Partial<ProbeableStore> {
  const segs = new Map<string, WormSegment>();
  return {
    async put(seg) {
      if (opts.putMs && opts.putMs > 0) await new Promise((r) => setTimeout(r, opts.putMs));
      segs.set(seg.segmentId, seg);
    },
    async get(id) {
      if (opts.getMs && opts.getMs > 0) await new Promise((r) => setTimeout(r, opts.getMs!));
      return segs.get(id) ?? null;
    },
    async list() {
      if (opts.listMs && opts.listMs > 0) await new Promise((r) => setTimeout(r, opts.listMs));
      return Array.from(segs.values());
    },
    async countBySigner() { return 0; },
    async refresh() {},
    async newestSeq() { return segs.size; },
    async probe(id: string) {
      // 模拟"对象已落盘"（put 虽然慢但最终写进去了）
      return opts.probeExists !== false && segs.has(id);
    },
  };
}

describe('withTimeout', () => {
  test('正常返回不超时', async () => {
    const v = await withTimeout(Promise.resolve(42), 1000, 'test');
    expect(v).toBe(42);
  });
  test('超时抛 worm-store-timeout', async () => {
    const slow = new Promise((r) => setTimeout(r, 200));
    let err: any = null;
    try { await withTimeout(slow, 30, 'unit-test'); } catch (e) { err = e; }
    expect(err).not.toBeNull();
    expect(err.code).toBe('worm-store-timeout');
    expect(err.message).toContain('unit-test');
  });
});

describe('createSemaphore', () => {
  test('并发超过上限时排队，最终全部完成', async () => {
    const sem = createSemaphore(5);
    let maxObserved = 0;
    let current = 0;
    const tasks: Promise<void>[] = [];
    for (let i = 0; i < 20; i++) {
      tasks.push((async () => {
        const rel = await sem.acquire();
        current++;
        maxObserved = Math.max(maxObserved, current);
        await new Promise((r) => setTimeout(r, 10));
        current--;
        rel();
      })());
    }
    await Promise.all(tasks);
    expect(maxObserved).toBeLessThanOrEqual(5);
    expect(maxObserved).toBe(5);
  });
});

describe('withResilience', () => {
  test('get 慢于超时 → 抛 worm-store-timeout，stats 计数 +1', async () => {
    const inner = delayedStore({ getMs: 500 });
    const store = withResilience(inner, { timeouts: { get: 30 } });
    let err: any = null;
    try { await store.get('WORM-0001-aaa'); } catch (e) { err = e; }
    expect(err?.code).toBe('worm-store-timeout');
    const s = store.stats();
    expect(s.timeoutsByMethod.get).toBe(1);
  });

  test('list 并发 25 个，in-flight 不超过上限', async () => {
    let observedMax = 0;
    let current = 0;
    const inner: AsyncWormStore = {
      async put() {},
      async get() { return null; },
      async list() {
        current++;
        observedMax = Math.max(observedMax, current);
        await new Promise((r) => setTimeout(r, 20));
        current--;
        return [];
      },
      async countBySigner() { return 0; },
      async refresh() {},
      async newestSeq() { return 0; },
    };
    const store = withResilience(inner, { maxInFlight: 5 });
    await Promise.all(Array.from({ length: 25 }, () => store.list()));
    expect(observedMax).toBeLessThanOrEqual(5);
  });

  test('put 超时但 probe 存在 → 视为成功，putTimeoutButExists +1', async () => {
    // put 延迟 200ms，超时设 30ms；probe 返回 true（对象其实已落盘，只是响应没回来）
    // 注意：probe 必须在 put 还没完成时就返回 true，模拟"网络丢包但对象已写"
    let putStarted = false;
    const inner: AsyncWormStore & ProbeableStore = {
      async put(seg) {
        putStarted = true;
        await new Promise((r) => setTimeout(r, 200));
      },
      async get() { return null; },
      async list() { return []; },
      async countBySigner() { return 0; },
      async refresh() {},
      async newestSeq() { return 0; },
      async probe() { return putStarted; }, // put 一发起就视为对象已在 S3
    };
    const store = withResilience(inner, { timeouts: { put: 30 } });
    const seg = fakeSegment('WORM-0001-aaa', 1);
    await store.put(seg);
    const s = store.stats();
    expect(s.putTimeoutButExists).toBe(1);
    expect(s.timeoutsByMethod.put ?? 0).toBe(1);
  });

  test('put 超时且 probe 不存在 → 抛 worm-store-timeout', async () => {
    const inner = delayedStore({ putMs: 200, probeExists: false });
    const store = withResilience(inner, { timeouts: { put: 30 } });
    const seg = fakeSegment('WORM-0002-bbb', 2);
    let err: any = null;
    try { await store.put(seg); } catch (e) { err = e; }
    expect(err?.code).toBe('worm-store-timeout');
    const s = store.stats();
    expect(s.putTimeoutButExists).toBe(0);
  });

  test('默认分档超时常量符合设计', () => {
    expect(DEFAULT_TIMEOUTS.put).toBe(30_000);
    expect(DEFAULT_TIMEOUTS.get).toBe(5_000);
    expect(DEFAULT_TIMEOUTS.list).toBe(10_000);
    expect(DEFAULT_TIMEOUTS.countBySigner).toBe(5_000);
    expect(DEFAULT_TIMEOUTS.refresh).toBe(10_000);
    expect(DEFAULT_TIMEOUTS.newestSeq).toBe(5_000);
    expect(DEFAULT_MAX_IN_FLIGHT).toBe(20);
  });

  test('stats() 返回当前 in-flight 与 queueDepth（运行期间非零）', async () => {
    let releaseGate: () => void = () => {};
    const inner: AsyncWormStore = {
      async put() {},
      async get() { return null; },
      async list() {
        await new Promise<void>((r) => { releaseGate = r; });
        return [];
      },
      async countBySigner() { return 0; },
      async refresh() {},
      async newestSeq() { return 0; },
    };
    const store = withResilience(inner, { maxInFlight: 1 });
    // 先占住唯一名额
    const p1 = store.list();
    // 第二个会排队
    const p2 = store.list();
    await new Promise((r) => setTimeout(r, 20));
    const s = store.stats();
    expect(s.inFlight).toBe(1);
    expect(s.queueDepth).toBe(1);
    releaseGate();
    await p1;
    // 让 p2 也跑起来再 release
    await new Promise((r) => setTimeout(r, 20));
    releaseGate();
    await p2;
    expect(store.stats().inFlight).toBe(0);
  });
});
