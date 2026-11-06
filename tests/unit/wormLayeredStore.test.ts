/**
 * 健澜AI原生医院操作系统OS - P5-16 分层 WORM store 契约测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, test } from 'bun:test';
import { MemoryWormStore, toAsyncStore } from '../../src/bff/aggregators/wormStore.js';
import { createLayeredWormStore, type SegmentDivergenceError } from '../../src/bff/aggregators/wormLayeredStore.js';
import type { WormSegment } from '../../src/bff/aggregators/wormArchiveAggregator.js';

function makeSeg(id: string, seq: number, hash: string, signer = 'k1'): WormSegment {
  return {
    segmentId: id,
    seq,
    eventCount: 1,
    segmentHash: hash,
    prevSegmentHash: '0'.repeat(64),
    cipherBytes: Buffer.from('x'),
    sm2Signature: 'sig',
    signerKeyId: signer,
    keySource: 'test',
    digestSm3: hash,
    sealedAt: '2026-01-01T00:00:00Z',
  } as unknown as WormSegment;
}

describe('wormLayeredStore', () => {
  test('1. remote 有、local 无 → get 返回 remote 那份', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    const rSeg = makeSeg('WORM-0001-a', 1, 'aaa');
    remote.put(rSeg);
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    const got = await layered.get('WORM-0001-a');
    expect(got?.segmentHash).toBe('aaa');
  });

  test('2. local 有、remote 无 → get 返回 local，sweep 后补传到 remote 并从 local 删除', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    const lSeg = makeSeg('WORM-0001-b', 1, 'bbb');
    local.put(lSeg);
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    // get 走 local 兜底
    const got = await layered.get('WORM-0001-b');
    expect(got?.segmentHash).toBe('bbb');
    // sweep 补传
    const r = await layered.sweep();
    expect(r.uploaded).toBe(1);
    expect(r.failed).toBe(0);
    expect(remote.get('WORM-0001-b')?.segmentHash).toBe('bbb');
    expect(local.get('WORM-0001-b')).toBeNull();
  });

  test('3. 两边都有、hash 相同 → 返回一份，不抛错', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    const seg = makeSeg('WORM-0001-c', 1, 'ccc');
    remote.put(seg);
    local.put(seg);
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    const list = await layered.list();
    expect(list.length).toBe(1);
    expect(list[0].segmentHash).toBe('ccc');
  });

  test('4. 两边都有、hash 不同 → 抛 worm-segment-divergence，不返回任何一侧', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    const rSeg = makeSeg('WORM-0001-d', 1, 'rrr');
    const lSeg = makeSeg('WORM-0001-d', 1, 'lll');
    remote.put(rSeg);
    local.put(lSeg);
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    // get 必须抛错，且不能返回 remote 或 local 任一侧
    let thrown: SegmentDivergenceError | null = null;
    let returned: WormSegment | null = null;
    try {
      returned = await layered.get('WORM-0001-d');
    } catch (e) {
      thrown = e as SegmentDivergenceError;
    }
    expect(thrown).not.toBeNull();
    expect(thrown!.code).toBe('worm-segment-divergence');
    expect(thrown!.segmentId).toBe('WORM-0001-d');
    expect(thrown!.remoteHash).toBe('rrr');
    expect(thrown!.localHash).toBe('lll');
    // 关键：不能返回任何一侧
    expect(returned).toBeNull();
    // list 也必须抛
    let listThrown = false;
    try {
      await layered.list();
    } catch {
      listThrown = true;
    }
    expect(listThrown).toBe(true);
  });

  test('5. countBySigner 两边同 id 不重复计数', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    const seg = makeSeg('WORM-0001-e', 1, 'eee', 'keyA');
    remote.put(seg);
    local.put(seg); // 同 id 同 hash
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    const n = await layered.countBySigner('keyA');
    expect(n).toBe(1); // 不是 2
  });

  test('6. newestSeq 取两边 max', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    remote.put(makeSeg('WORM-0001-f', 5, 'fff'));
    local.put(makeSeg('WORM-0009-g', 9, 'ggg'));
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    expect(await layered.newestSeq()).toBe(9);
  });

  test('7. sweep 幂等：连跑两次，第二次 uploaded=0', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    local.put(makeSeg('WORM-0001-h', 1, 'hhh'));
    const layered = createLayeredWormStore(toAsyncStore(remote), local);
    const r1 = await layered.sweep();
    expect(r1.uploaded).toBe(1);
    const r2 = await layered.sweep();
    expect(r2.uploaded).toBe(0);
    expect(r2.skipped).toBe(0);
  });

  test('8. 补传失败 → 段保留在 local，failed+1，下次 sweep 重试', async () => {
    const remote = new MemoryWormStore();
    const local = new MemoryWormStore();
    const lSeg = makeSeg('WORM-0001-i', 1, 'iii');
    local.put(lSeg);
    // 包装一个会失败的 remote
    const goodRemote = toAsyncStore(remote);
    let failNext = true;
    const flakyRemote: typeof goodRemote = {
      ...goodRemote,
      async put(seg) {
        if (failNext) { failNext = false; throw new Error('simulated s3 failure'); }
        return goodRemote.put(seg);
      },
    };
    const layered = createLayeredWormStore(flakyRemote, local);
    const r1 = await layered.sweep();
    expect(r1.failed).toBe(1);
    expect(r1.uploaded).toBe(0);
    expect(local.get('WORM-0001-i')).not.toBeNull();
    // 第二次成功
    const r2 = await layered.sweep();
    expect(r2.uploaded).toBe(1);
    expect(local.get('WORM-0001-i')).toBeNull();
  });
});
