/**
 * 健澜AI原生医院操作系统OS - P5-5 WORM 段存储后端抽象
 *
 * - MemoryWormStore：纯内存（默认）
 * - FileWormStore：每段一个 JSON 文件，写完只读，重启后从磁盘加载
 * - 路径穿越防护：segmentId 白名单正则 + path.resolve 仍在 store 目录内
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { platform } from 'node:process';
import { WormSegment } from './wormArchiveAggregator.js';

export const SEGMENT_ID_RE = /^(WORM-\d{4}-[a-z0-9]+|VERIFY-PROBE-\d+-[a-z0-9]+)$/;

export function isValidSegmentId(id: string): boolean {
  return SEGMENT_ID_RE.test(id);
}

export interface WormStore {
  readonly kind: 'memory' | 'fs';
  put(segment: WormSegment): void;
  get(segmentId: string): WormSegment | null;
  list(): WormSegment[];
  count(): number;
  /** P5-10：按 signerKeyId 倒排统计，O(1)；索引在 put/refresh 时维护 */
  countBySigner(keyId: string): number;
  /**
   * P5-11b：可选的全量重扫。仅文件后端需要；内存后端天然一致，不实现。
   * 供破坏性操作（purge 判定）在索引 0 命中时强制校准，避免窄窗口漏检。
   */
  refresh?(): void;
}

/**
 * P5-15 异步 WORM 存储接口，专用于网络后端（如 S3）。
 *
 * 现有同步 WormStore 只适配本地 fs/内存；S3 是网络 IO，天生异步。
 * 真正接入 S3 前需把 wormArchiveAggregator 调用链改为 async；本切片只到 mock 契约层。
 */
export interface AsyncWormStore {
  put(segment: WormSegment): Promise<void>;
  get(segmentId: string): Promise<WormSegment | null>;
  list(): Promise<WormSegment[]>;
  countBySigner(keyId: string): Promise<number>;
  refresh(): Promise<void>;
  newestSeq(): Promise<number>;
}

/** 把同步 WormStore 包成 AsyncWormStore，供契约测试用同一套用例跑两种实现。 */
export function toAsyncStore(sync: WormStore): AsyncWormStore {
  return {
    async put(segment) { sync.put(segment); },
    async get(segmentId) { return sync.get(segmentId); },
    async list() { return sync.list(); },
    async countBySigner(keyId) { return sync.countBySigner(keyId); },
    async refresh() { sync.refresh?.(); },
    async newestSeq() {
      const list = sync.list();
      return list.length === 0 ? 0 : Math.max(...list.map((s) => s.seq));
    },
  };
}

export class MemoryWormStore implements WormStore {
  readonly kind = 'memory' as const;
  private map = new Map<string, WormSegment>();
  private bySigner = new Map<string, number>();

  put(segment: WormSegment): void {
    if (this.map.has(segment.segmentId)) throw new Error('duplicate-segment');
    this.map.set(segment.segmentId, segment);
    const k = segment.signerKeyId ?? '';
    this.bySigner.set(k, (this.bySigner.get(k) ?? 0) + 1);
  }
  get(segmentId: string): WormSegment | null {
    return this.map.get(segmentId) ?? null;
  }
  list(): WormSegment[] {
    return Array.from(this.map.values()).sort((a, b) => a.seq - b.seq);
  }
  count(): number { return this.map.size; }
  countBySigner(keyId: string): number { return this.bySigner.get(keyId) ?? 0; }
  __clear(): void {
    this.map.clear();
    this.bySigner.clear();
  }
  delete(segmentId: string): void {
    const seg = this.map.get(segmentId);
    if (!seg) return;
    this.map.delete(segmentId);
    const k = seg.signerKeyId ?? '';
    const n = (this.bySigner.get(k) ?? 0) - 1;
    if (n <= 0) this.bySigner.delete(k);
    else this.bySigner.set(k, n);
  }
}

export class FileWormStore implements WormStore {
  readonly kind = 'fs' as const;
  readonly dir: string;
  private segments: WormSegment[] = [];
  private byId = new Map<string, WormSegment>();
  private bySigner = new Map<string, number>();
  // P5-11：目录变更自动检测
  private lastScanMtimeMs = 0;
  private lastFileCount = 0;

  constructor(dir?: string) {
    this.dir = path.resolve(dir ?? process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store'));
    mkdirSync(this.dir, { recursive: true });
    this.refresh();
  }

  /**
   * 轻量变更检测：statSync(dir) 比 mtimeMs，O(微秒)。
   * mtime 变化时才 readdirSync 计数；不一致才 refresh()。
   * 不在每次调用都 readdirSync。
   */
  private autoDetect(): void {
    try {
      const st = require('node:fs').statSync(this.dir);
      if (st.mtimeMs === this.lastScanMtimeMs) return;
      const names = require('node:fs').readdirSync(this.dir).filter((n: string) => n.endsWith('.json'));
      if (st.mtimeMs !== this.lastScanMtimeMs || names.length !== this.lastFileCount) {
        this.refresh();
      }
    } catch { /* ignore */ }
  }

  /**
   * 重新扫目录重建内存索引（含 bySigner 倒排）。
   * 显式调用供确定性场景使用；日常读路径由 autoDetect() 轻量检测。
   */
  refresh(): void {
    this.segments = [];
    this.byId.clear();
    this.bySigner.clear();
    let names: string[] = [];
    try { names = readdirSync(this.dir); } catch { return; }
    let fileCount = 0;
    for (const n of names) {
      if (!n.endsWith('.json')) continue;
      fileCount++;
      const id = n.slice(0, -5);
      if (!isValidSegmentId(id)) continue;
      try {
        const seg = JSON.parse(readFileSync(path.join(this.dir, n), 'utf8')) as WormSegment;
        this.segments.push(seg);
        this.byId.set(seg.segmentId, seg);
        const k = seg.signerKeyId ?? '';
        this.bySigner.set(k, (this.bySigner.get(k) ?? 0) + 1);
      } catch { /* 损坏文件跳过 */ }
    }
    this.segments.sort((a, b) => a.seq - b.seq);
    try { this.lastScanMtimeMs = require('node:fs').statSync(this.dir).mtimeMs; } catch { /* ignore */ }
    this.lastFileCount = fileCount;
  }

  private safePath(segmentId: string): string {
    if (!isValidSegmentId(segmentId)) throw new Error('invalid-segment-id');
    const p = path.join(this.dir, `${segmentId}.json`);
    const resolved = path.resolve(p);
    if (!resolved.startsWith(path.resolve(this.dir) + path.sep) && resolved !== path.resolve(this.dir)) {
      throw new Error('invalid-segment-id');
    }
    return resolved;
  }

  put(segment: WormSegment): void {
    const p = this.safePath(segment.segmentId);
    if (existsSync(p)) throw new Error('duplicate-segment');
    writeFileSync(p, JSON.stringify(segment, null, 2), 'utf8');
    if (platform === 'win32') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cp = require('node:child_process') as { execSync: (cmd: string, opts?: unknown) => unknown };
        cp.execSync(`attrib +R "${p}"`, { stdio: 'ignore' });
      } catch { /* 忽略 */ }
    }
    this.segments.push(segment);
    this.byId.set(segment.segmentId, segment);
    const k = segment.signerKeyId ?? '';
    this.bySigner.set(k, (this.bySigner.get(k) ?? 0) + 1);
    this.segments.sort((a, b) => a.seq - b.seq);
  }

  get(segmentId: string): WormSegment | null {
    const cached = this.byId.get(segmentId);
    if (cached) return cached;
    const p = this.safePath(segmentId);
    if (!existsSync(p)) return null;
    try {
      const raw = readFileSync(p, 'utf8');
      const seg = JSON.parse(raw) as WormSegment;
      this.byId.set(segmentId, seg);
      this.segments.push(seg);
      const k = seg.signerKeyId ?? '';
      this.bySigner.set(k, (this.bySigner.get(k) ?? 0) + 1);
      this.segments.sort((a, b) => a.seq - b.seq);
      return seg;
    } catch {
      return null;
    }
  }

  list(): WormSegment[] {
    this.autoDetect();
    return this.segments.slice();
  }

  count(): number {
    this.autoDetect();
    return this.segments.length;
  }

  countBySigner(keyId: string): number {
    this.autoDetect();
    return this.bySigner.get(keyId) ?? 0;
  }
}

let _store: WormStore | null = null;
let _loggedBackend = false;
export function getWormBackendInfo(): { backend: 'fs' | 'memory'; dir: string } {
  if (process.env.WORM_BACKEND === 'fs') {
    const dir = path.resolve(process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store'));
    return { backend: 'fs', dir };
  }
  return { backend: 'memory', dir: '(in-process memory; not persisted)' };
}

/**
 * P5-13 安全自检：audit=pg + worm=memory 是最危险组合。
 * production 抛错拒绝启动；其他环境 console.error 但不阻断（E2E/单测跑在 memory 上）。
 */
export function assertWormAuditCombo(
  auditKind: 'pg' | 'memory',
  wormBackend: 'fs' | 'memory',
  nodeEnv: string,
): { ok: boolean; message: string } {
  if (auditKind === 'pg' && wormBackend === 'memory') {
    const msg = '审计事件已持久化到 PG，但 WORM 段仅在内存。重启后 lastArchivedSeq 归零，'
      + '会把已归档事件重复归档并覆盖旧段。请设置 WORM_BACKEND=fs。';
    if (nodeEnv === 'production') {
      return { ok: false, message: `[worm] unsafe combo: ${msg}` };
    }
    console.error(`[worm] unsafe combo: ${msg}`);
    return { ok: true, message: msg };
  }
  return { ok: true, message: '' };
}
export function getWormStore(): WormStore {
  if (!_store) {
    if (process.env.WORM_BACKEND === 'fs') {
      _store = new FileWormStore();
    } else {
      _store = new MemoryWormStore();
    }
  }
  if (!_loggedBackend) {
    _loggedBackend = true;
    const info = getWormBackendInfo();
    if (info.backend === 'fs') {
      console.info(`[worm] backend=fs dir=${info.dir}`);
    } else {
      console.warn(`[worm] backend=memory — segments are NOT persisted; restart will re-archive already-sealed events and BREAK the cross-segment chain. Set WORM_BACKEND=fs for production.`);
    }
  }
  return _store;
}
export function __resetWormStore(): void {
  if (_store instanceof MemoryWormStore) _store.__clear();
  _store = null;
}
