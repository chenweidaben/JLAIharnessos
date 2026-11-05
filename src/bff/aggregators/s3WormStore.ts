/**
 * 健澜AI原生医院操作系统OS - P5-15 S3 WORM 段存储适配器（mock，未联调）
 *
 * ⚠️ NOT INTEGRATED — mock only, no real S3 endpoint.
 *
 * 实现 WormStore 接口，与 MemoryWormStore / FileWormStore 行为对齐。
 * 通过可注入的 S3Like 接口（putObject/getObject/listObjects）解耦真实 SDK，
 * 单测里用内存实现的 MockS3Client 跑同一套契约用例。
 *
 * 联调时需要：
 *   - 真实 @aws-sdk/client-s3 实现 S3Like
 *   - env: S3_BUCKET, S3_PREFIX, AWS_REGION（值不写在这）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { WormSegment } from './wormArchiveAggregator.js';
import type { WormStore } from './wormStore.js';

/** 最小 S3 子集：只覆盖 WORM 段需要的操作 */
export interface S3Like {
  putObject(args: { Bucket: string; Key: string; Body: string }): Promise<void>;
  getObject(args: { Bucket: string; Key: string }): Promise<{ Body: string }>;
  listObjects(args: { Bucket: string; Prefix: string }): Promise<{ Keys: string[] }>;
}

/** 内存 mock S3 客户端，用于契约测试 */
export class MockS3Client implements S3Like {
  public store = new Map<string, string>();
  async putObject(args: { Bucket: string; Key: string; Body: string }): Promise<void> {
    this.store.set(`${args.Bucket}/${args.Key}`, args.Body);
  }
  async getObject(args: { Bucket: string; Key: string }): Promise<{ Body: string }> {
    const v = this.store.get(`${args.Bucket}/${args.Key}`);
    if (v === undefined) throw new Error('NoSuchKey');
    return { Body: v };
  }
  async listObjects(args: { Bucket: string; Prefix: string }): Promise<{ Keys: string[] }> {
    const prefix = `${args.Bucket}/${args.Prefix}`;
    const out: string[] = [];
    for (const k of this.store.keys()) if (k.startsWith(prefix)) out.push(k.slice(args.Bucket.length + 1));
    return { Keys: out.sort() };
  }
}

export class S3WormStore implements WormStore {
  readonly kind = 'memory' as const; // 接口要求，不代表后端
  private s3: S3Like;
  private bucket: string;
  private prefix: string;
  private cache = new Map<string, WormSegment>();
  private bySigner = new Map<string, number>();

  constructor(s3: S3Like, bucket: string, prefix = 'worm/segments/') {
    this.s3 = s3;
    this.bucket = bucket;
    this.prefix = prefix;
  }

  private key(segmentId: string): string {
    return `${this.prefix}${segmentId}.json`;
  }

  async put(segment: WormSegment): Promise<void> {
    if (this.cache.has(segment.segmentId)) throw new Error('duplicate-segment');
    await this.s3.putObject({
      Bucket: this.bucket,
      Key: this.key(segment.segmentId),
      Body: JSON.stringify(segment),
    });
    this.cache.set(segment.segmentId, segment);
    const k = segment.signerKeyId ?? '';
    this.bySigner.set(k, (this.bySigner.get(k) ?? 0) + 1);
  }

  async get(segmentId: string): Promise<WormSegment | null> {
    const cached = this.cache.get(segmentId);
    if (cached) return cached;
    try {
      const { Body } = await this.s3.getObject({ Bucket: this.bucket, Key: this.key(segmentId) });
      const seg = JSON.parse(Body) as WormSegment;
      this.cache.set(segmentId, seg);
      return seg;
    } catch (e) {
      if ((e as Error).message === 'NoSuchKey') return null;
      throw e;
    }
  }

  async list(): Promise<WormSegment[]> {
    const { Keys } = await this.s3.listObjects({ Bucket: this.bucket, Prefix: this.prefix });
    const segs: WormSegment[] = [];
    for (const k of Keys) {
      const id = k.slice(this.prefix.length, k.length - 5); // 去掉前缀和 .json
      const seg = await this.get(id);
      if (seg) segs.push(seg);
    }
    return segs.sort((a, b) => a.seq - b.seq);
  }

  count(): number { return this.cache.size; }

  countBySigner(keyId: string): number { return this.bySigner.get(keyId) ?? 0; }

  /** 强制从 S3 重新拉列表，清缓存 */
  async refresh(): Promise<void> {
    this.cache.clear();
    this.bySigner.clear();
    const { Keys } = await this.s3.listObjects({ Bucket: this.bucket, Prefix: this.prefix });
    for (const k of Keys) {
      const id = k.slice(this.prefix.length, k.length - 5);
      try {
        const { Body } = await this.s3.getObject({ Bucket: this.bucket, Key: k });
        const seg = JSON.parse(Body) as WormSegment;
        this.cache.set(id, seg);
        const sk = seg.signerKeyId ?? '';
        this.bySigner.set(sk, (this.bySigner.get(sk) ?? 0) + 1);
      } catch { /* skip unreadable */ }
    }
  }
}
