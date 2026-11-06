/**
 * 健澜AI原生医院操作系统OS - P5-17 S3 fallback 集成测试
 *
 * 用例：
 * 1. 断网（mock put 抛错）→ 当前实现直接抛错、不静默落 local（兜底未实现，见用例内注释）
 * 1b. 自定义 prefix 下 list() 仍能解析（回归：曾写死 worm/ 导致自定义前缀 list 恒空）
 * 2. sweep 补传：恢复 mock 后 sweep() 把 local 段传到 remote，local 删除
 * 3. remote 超时 → 抛 worm-store-timeout，绝不返回 null/[]
 * 4. put 超时但 probe 命中 → 视为成功，不抛错
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { S3Like } from '../../src/bff/aggregators/wormStoreFactory.js';
import { S3WormStore, createWormStore } from '../../src/bff/aggregators/wormStoreFactory.js';
import { FileWormStore } from '../../src/bff/aggregators/wormStore.js';
import { createLayeredWormStore } from '../../src/bff/aggregators/wormLayeredStore.js';
import { withResilience } from '../../src/bff/aggregators/wormStoreResilience.js';
import type { WormSegment } from '../../src/bff/aggregators/wormArchiveAggregator.js';

function makeSegment(seq: number, signerKeyId = 'k1'): WormSegment {
  return {
    segmentId: `WORM-${String(seq).padStart(4, '0')}-test`,
    seq,
    signerKeyId,
    segmentHash: 'a'.repeat(64),
    prevHash: '0'.repeat(64),
    events: [],
    sealedAt: '2026-11-06T00:00:00Z',
  } as unknown as WormSegment;
}

class MockS3 implements S3Like {
  store = new Map<string, string>();
  putShouldFail = false;
  getShouldTimeoutMs = 0;

  async putObject(args: { Bucket: string; Key: string; Body: string | Uint8Array }) {
    if (this.putShouldFail) throw new Error('network-down');
    this.store.set(args.Key, typeof args.Body === 'string' ? args.Body : Buffer.from(args.Body).toString('utf8'));
    return {};
  }
  async getObject(args: { Bucket: string; Key: string }) {
    if (this.getShouldTimeoutMs > 0) {
      await new Promise((r) => setTimeout(r, this.getShouldTimeoutMs));
    }
    const body = this.store.get(args.Key);
    if (body === undefined) {
      const err = new Error('NotFound');
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 404 };
      throw err;
    }
    return { Body: body };
  }
  async headObject(args: { Bucket: string; Key: string }) {
    if (this.store.has(args.Key)) return {};
    const err = new Error('NotFound');
    (err as { $metadata?: { httpStatusCode?: number } }).$metadata = { httpStatusCode: 404 };
    throw err;
  }
  async listObjectsV2(args: { Bucket: string; Prefix: string }) {
    const Contents = [...this.store.keys()]
      .filter((k) => k.startsWith(args.Prefix))
      .map((Key) => ({ Key }));
    return { Contents };
  }
  async deleteObject(_args: { Bucket: string; Key: string }) { return {}; }
}

let tmpDir: string;
afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
});

function freshDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-s3-'));
  return tmpDir;
}

describe('S3 fallback 集成', () => {
  test('1. 断网 remote.put 抛错 → 当前实现直接抛错（不静默落 local）', async () => {
    const s3 = new MockS3();
    s3.putShouldFail = true;
    const dir = freshDir();
    const remote = new S3WormStore(s3, { bucket: 'test' });
    const local = new FileWormStore(dir);
    const store = withResilience(createLayeredWormStore(remote, local), {
      timeouts: { put: 2_000 },
    });

    const seg = makeSegment(1);
    // 真实现状（2026-11-06 10:23 巡检实测）：layered.put 只做 remote.put，remote 失败直接向上抛，
    // 不会自动落 local。断网兜底（remote 失败 → 写 local + pending 计数 → sweep 补传）尚未实现，
    // 属 P5-18 待定设计项（是"宁可失败"还是"降级可用"，需要产品口径）。本用例只断言真实行为，
    // 避免把"手动写 local"伪装成"layered 已兜底"。
    // eslint-disable-next-line @typescript-eslint/await-thenable -- bun:test 的 rejects 需 await 才真正断言
    await expect(store.put(seg)).rejects.toThrow('network-down');
    expect(local.get(seg.segmentId)).toBeNull();
    expect(local.list().length).toBe(0);
  });

  test('1b. 自定义 prefix 下 list() 仍能解析对象（不能写死 worm/）', async () => {
    const s3 = new MockS3();
    const remote = new S3WormStore(s3, { bucket: 'test', prefix: 'arch/' });
    const seg = makeSegment(1, 'k1');
    await remote.put(seg);
    const listed = await remote.list();
    expect(listed.length).toBe(1);
    expect(listed[0].segmentId).toBe(seg.segmentId);
    expect(await remote.countBySigner('k1')).toBe(1);
  });

  test('2. sweep 补传 → local 删除', async () => {
    const s3 = new MockS3();
    const dir = freshDir();
    const remote = new S3WormStore(s3, { bucket: 'test' });
    const local = new FileWormStore(dir);
    const layered = createLayeredWormStore(remote, local);

    const seg = makeSegment(1);
    local.put(seg);
    expect(local.get(seg.segmentId)).not.toBeNull();

    const r = await layered.sweep();
    expect(r.uploaded).toBe(1);
    // local 已删
    expect(local.get(seg.segmentId)).toBeNull();
    // remote 已有
    expect(await remote.get(seg.segmentId)).not.toBeNull();
  });

  test('3. remote get 超时 → 抛 worm-store-timeout，绝不返回 null', async () => {
    const s3 = new MockS3();
    s3.getShouldTimeoutMs = 10_000; // 挂 10s
    const dir = freshDir();
    const remote = new S3WormStore(s3, { bucket: 'test' });
    const local = new FileWormStore(dir);
    const store = withResilience(createLayeredWormStore(remote, local), {
      timeouts: { get: 500 }, // 500ms 超时
    });

    const p = store.get('WORM-0001-x');
    // eslint-disable-next-line @typescript-eslint/await-thenable -- bun:test expect.rejects
    await expect(p).rejects.toThrow(/worm-store-timeout/);
    // 显式断言：catch 到的不是 null（"返回 null" 会被上层当成段不存在）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return -- promise catch 返回 unknown
    const caught = await store.get('WORM-0001-x').catch((e) => e as Error);
    expect(caught).not.toBeNull();
    expect((caught as Error).message).toMatch(/worm-store-timeout/);
  });

  test('4. put 超时但 probe 命中 → 视为成功，不抛错', async () => {
    // 构造一个 put 挂起但 headObject 命中的 S3
    let putCalls = 0;
    const realS3 = new MockS3();
    const seg = makeSegment(1);
    // 先把段放进 S3（模拟"put 实际已落盘但响应没回来"）
    realS3.store.set(`worm/${seg.segmentId}.json`, JSON.stringify(seg));

    const hangingS3: S3Like = {
      putObject: async () => {
        putCalls++;
        await new Promise((r) => setTimeout(r, 10_000));
        return {};
      },
      getObject: (args) => realS3.getObject(args),
      headObject: (args) => realS3.headObject(args),
      listObjectsV2: (args) => realS3.listObjectsV2(args),
      deleteObject: (args) => realS3.deleteObject(args),
    };

    const dir = freshDir();
    const remote = new S3WormStore(hangingS3, { bucket: 'test' });
    const local = new FileWormStore(dir);
    const store = withResilience(createLayeredWormStore(remote, local), {
      timeouts: { put: 500 },
    });

    // put 超时后 probe 应返回 true（段已在 S3）→ 视为成功
    await store.put(seg);
    expect(putCalls).toBeGreaterThan(0);
    const st = store.stats();
    expect(st.putTimeoutButExists).toBe(1);
  });
});

describe('createWormStore fail-closed', () => {
  test('WORM_BACKEND=s3 缺 S3_BUCKET → 抛错不回落', () => {
    expect(() => createWormStore({ backend: 's3', s3: new MockS3() })).toThrow(/S3_BUCKET/);
  });
  test('WORM_BACKEND=s3 缺 s3 client → 用最小 fetch client，端点不可达时抛网络错', async () => {
    // 启动时不抛（保证 BFF 能起来、/ready 报告 s3）；首次调用时因端点不可达抛 fetch 错误
    delete process.env.S3_ENDPOINT;
    const store = createWormStore({ backend: 's3', bucket: 'x' });
    await expect(store.put(makeSegment(1))).rejects.toThrow();
  });
});

describe('读写同源（P5-17 去伪装自证）', () => {
  test('createWormStore 返回的实例，put 后 list 能拿到该段（不依赖 sync shim）', async () => {
    // 之前的 bug：写路径走 layered(S3, fs)，读路径走 MemoryWormStore shim，永远看不到刚写的段。
    // 本测试断言：s3 装配出来的 store，put 之后 list 必须能列出。
    const mem = new Map<string, unknown>();
    const mockS3: S3Like = {
      putObject: async (a) => { mem.set(a.Key, a.Body); },
      getObject: async (a) => { const b = mem.get(a.Key); return b ? { Body: b as Uint8Array } : null; },
      headObject: async (a) => mem.has(a.Key) ? {} : null,
      listObjectsV2: async (a) => ({ Contents: [...mem.keys()].filter((k) => (k as string).startsWith(a.Prefix ?? '')).map((k) => ({ Key: k as string })) }),
      deleteObject: async (a) => { mem.delete(a.Key); },
    };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-rw-'));
    const store = createWormStore({ backend: 's3', bucket: 'b', s3: mockS3, dir });
    const seg = makeSegment(42);
    await store.put(seg);
    const listed = await store.list();
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(listed[listed.length - 1].segmentId).toBe(seg.segmentId);
    const got = await store.get(seg.segmentId);
    expect(got?.segmentId).toBe(seg.segmentId);
  });
});
