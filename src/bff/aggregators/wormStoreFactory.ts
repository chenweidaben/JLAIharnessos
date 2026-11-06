/**
 * 健澜AI原生医院操作系统OS - P5-17 S3 WORM store 后端 + 工厂
 *
 * 组合顺序（不能反）：
 *   withResilience(                ← 外层：超时 + 并发上限 + put 超时补救
 *     createLayeredWormStore(      ← 内层：remote ∪ local + divergence 校验
 *       new S3WormStore(s3),
 *       fileStore,
 *     ),
 *   )
 *
 * 为什么不能反：
 *   - 如果 layered 在外层，超时发生在 remote.put 内部，layered 会把"超时"误判成"remote miss"，
 *     然后把段写到 local 兜底——这是最危险的假成功：上层以为 put 成功，实际 S3 可能没收到。
 *   - resilience 在外层时，超时直接抛 worm-store-timeout，由 resilience 调 probe 判定对象是否真落盘。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as path from 'node:path';
import type { AsyncWormStore, WormStore } from './wormStore.js';
import { MemoryWormStore, FileWormStore, toAsyncStore } from './wormStore.js';
import type { WormSegment } from './wormArchiveAggregator.js';
import { createLayeredWormStore } from './wormLayeredStore.js';
import { withResilience, type ResilientWormStore } from './wormStoreResilience.js';

/**
 * 最小 S3 client 形态（兼容 @aws-sdk/client-s3 的子集）。
 * 测试用 MockS3Client 实现同一接口。
 */
export interface S3Like {
  putObject(args: { Bucket: string; Key: string; Body: string | Uint8Array }): Promise<unknown>;
  getObject(args: { Bucket: string; Key: string }): Promise<{ Body: string | Uint8Array } | null>;
  headObject(args: { Bucket: string; Key: string }): Promise<unknown>;
  listObjectsV2(args: { Bucket: string; Prefix: string }): Promise<{ Contents?: { Key?: string }[] }>;
  deleteObject(args: { Bucket: string; Key: string }): Promise<unknown>;
}

export interface S3WormStoreOptions {
  bucket: string;
  /** key 前缀，默认 "worm/" */
  prefix?: string;
}

/**
 * S3 WORM store：段以 JSON 形式存为 <prefix><segmentId>.json。
 * - put：覆盖写（天然幂等）
 * - get：headObject 不存在返回 null（不抛 404，转成 null）
 * - probe：headObject 200 → true，404 → false
 */
export class S3WormStore implements AsyncWormStore {
  readonly kind = 's3' as const;
  private readonly bucket: string;
  private readonly prefix: string;
  /** 由 prefix 推导的 key 解析正则（不能写死 "worm/"，否则自定义前缀下 list() 恒为空） */
  private readonly keyRe: RegExp;

  constructor(private readonly s3: S3Like, opts: S3WormStoreOptions) {
    this.bucket = opts.bucket;
    this.prefix = opts.prefix ?? 'worm/';
    const escaped = this.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.keyRe = new RegExp(`^${escaped}(.+)\\.json$`);
  }

  private key(segmentId: string): string {
    return `${this.prefix}${segmentId}.json`;
  }

  async put(segment: WormSegment): Promise<void> {
    await this.s3.putObject({
      Bucket: this.bucket,
      Key: this.key(segment.segmentId),
      Body: JSON.stringify(segment),
    });
  }

  async get(segmentId: string): Promise<WormSegment | null> {
    try {
      const obj = await this.s3.getObject({ Bucket: this.bucket, Key: this.key(segmentId) });
      if (!obj) return null;
      const body = typeof obj.Body === 'string' ? obj.Body : Buffer.from(obj.Body).toString('utf8');
      return JSON.parse(body) as WormSegment;
    } catch (err) {
      const code = (err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (code === 404) return null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      throw err;
    }
  }

  async probe(segmentId: string): Promise<boolean> {
    try {
      await this.s3.headObject({ Bucket: this.bucket, Key: this.key(segmentId) });
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<WormSegment[]> {
    const out: WormSegment[] = [];
    const res = await this.s3.listObjectsV2({ Bucket: this.bucket, Prefix: this.prefix });
    for (const item of res.Contents ?? []) {
      const k = item.Key;
      if (!k) continue;
      const m = this.keyRe.exec(k);
      if (!m) continue;
      const segId = m[1];
      const seg = await this.get(segId);
      if (seg) out.push(seg);
    }
    return out.sort((a, b) => a.seq - b.seq);
  }

  async countBySigner(keyId: string): Promise<number> {
    const all = await this.list();
    return all.filter((s) => s.signerKeyId === keyId).length;
  }

  async refresh(): Promise<void> {
    // S3 是远程存储，无本地缓存需要刷新
  }

  async newestSeq(): Promise<number> {
    const all = await this.list();
    return all.length === 0 ? 0 : Math.max(...all.map((s) => s.seq));
  }
}

export interface WormStoreFactoryOptions {
  /** 覆盖 WORM_BACKEND（测试用） */
  backend?: 'memory' | 'fs' | 's3';
  /** S3 client（测试注入） */
  s3?: S3Like;
  /** 覆盖 S3_BUCKET（测试用） */
  bucket?: string;
  /** 覆盖 WORM_STORE_DIR（测试用） */
  dir?: string;
}

/**
 * 根据 env 组装 WORM store。
 *
 * - WORM_BACKEND=memory → MemoryWormStore（同步，包成 async）
 * - WORM_BACKEND=fs → FileWormStore（同步，包成 async）
 * - WORM_BACKEND=s3 → withResilience(layered(S3WormStore, FileWormStore))
 *   - 缺 S3_BUCKET / s3 client → 抛错（fail-closed，不回落 memory）
 *
 * 组合顺序见文件头注释。
 */
export function createWormStore(opts: WormStoreFactoryOptions = {}): ResilientWormStore {
  const backend = opts.backend ?? (process.env.WORM_BACKEND as 'memory' | 'fs' | 's3' | undefined) ?? 'memory';

  if (backend === 'memory') {
    return withResilience(toAsyncStore(new MemoryWormStore()));
  }

  if (backend === 'fs') {
    const dir = opts.dir ?? process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store');
    return withResilience(toAsyncStore(new FileWormStore(dir)));
  }

  if (backend === 's3') {
    const bucket = opts.bucket ?? process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error('WORM_BACKEND=s3 requires S3_BUCKET env (fail-closed, no fallback to memory/fs)');
    }
    const local = new FileWormStore(opts.dir ?? process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store'));
    const s3 = opts.s3 ?? createMinimalS3Client();
    const remote = new S3WormStore(s3, { bucket });
    const layered = createLayeredWormStore(remote, local);
    console.info(`[worm] backend=s3 remote=bucket=${bucket} local=${local.dir}`);
    return withResilience(layered);
  }

  throw new Error(`unknown WORM_BACKEND=${String(backend)}`);
}

/**
 * 最小 S3 client：基于 fetch，不依赖 @aws-sdk。
 *
 * !!! NOT PRODUCTION READY — no SigV4 signing !!!
 * 没有 SigV4 签名，对接真实 S3 端点会返 403。本实现仅用于：
 * - 本地 MinIO 匿名开发
 * - 集成测试装配验证
 * - /ready 报 s3 装配状态（不等价于 s3 可用）
 *
 * 生产部署必须通过 opts.s3 注入 @aws-sdk/client-s3 实例（带 SigV4）。
 * P5-18 任务：把 createMinimalS3Client 替换为 @aws-sdk/client-s3 工厂。
 */
function createMinimalS3Client(): S3Like {
  const endpoint = process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000';
  const url = (bucket: string, key: string) => `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponent(key)}`;
  return {
    putObject: async (args: { Bucket: string; Key: string; Body: Uint8Array }) => {
      const res = await fetch(url(args.Bucket, args.Key), { method: 'PUT', body: args.Body as unknown as BodyInit });
      if (!res.ok) throw new Error(`S3 putObject ${args.Key}: ${res.status} ${await res.text()}`);
    },
    getObject: async (args: { Bucket: string; Key: string }) => {
      const res = await fetch(url(args.Bucket, args.Key));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`S3 getObject ${args.Key}: ${res.status}`);
      return { Body: new Uint8Array(await res.arrayBuffer()) };
    },
    headObject: async (args: { Bucket: string; Key: string }) => {
      const res = await fetch(url(args.Bucket, args.Key), { method: 'HEAD' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`S3 headObject ${args.Key}: ${res.status}`);
      return {};
    },
    listObjectsV2: async (args: { Bucket: string; Prefix?: string }) => {
      const sep = endpoint.includes('?') ? '&' : '?';
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/${args.Bucket}${sep}list-type=2&prefix=${encodeURIComponent(args.Prefix ?? '')}`);
      if (!res.ok) throw new Error(`S3 listObjectsV2: ${res.status}`);
      const text = await res.text();
      // 简化 XML 解析，只取 Key 标签
      const keys = [...text.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => ({ Key: m[1] }));
      return { Contents: keys };
    },
    deleteObject: async (args: { Bucket: string; Key: string }) => {
      const res = await fetch(url(args.Bucket, args.Key), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(`S3 deleteObject ${args.Key}: ${res.status}`);
    },
  };
}

// 同步版本（wormArchiveAggregator 当前仍用同步 WormStore 接口；B 阶段只完成 async 接线，
// 切换到 async store 是 P5-18 的事）
export function createSyncWormStore(opts: { backend?: 'memory' | 'fs'; dir?: string } = {}): WormStore {
  const backend = opts.backend ?? (process.env.WORM_BACKEND as 'memory' | 'fs' | undefined) ?? 'memory';
  if (backend === 'fs') return new FileWormStore(opts.dir ?? process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store'));
  return new MemoryWormStore();
}
