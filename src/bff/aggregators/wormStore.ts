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
}

export class MemoryWormStore implements WormStore {
  readonly kind = 'memory' as const;
  private map = new Map<string, WormSegment>();

  put(segment: WormSegment): void {
    if (this.map.has(segment.segmentId)) throw new Error('duplicate-segment');
    this.map.set(segment.segmentId, segment);
  }
  get(segmentId: string): WormSegment | null {
    return this.map.get(segmentId) ?? null;
  }
  list(): WormSegment[] {
    return Array.from(this.map.values()).sort((a, b) => a.seq - b.seq);
  }
  count(): number { return this.map.size; }
  __clear(): void { this.map.clear(); }
}

export class FileWormStore implements WormStore {
  readonly kind = 'fs' as const;
  readonly dir: string;

  constructor(dir?: string) {
    this.dir = path.resolve(dir ?? process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store'));
    mkdirSync(this.dir, { recursive: true });
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
  }

  get(segmentId: string): WormSegment | null {
    const p = this.safePath(segmentId);
    if (!existsSync(p)) return null;
    try {
      const raw = readFileSync(p, 'utf8');
      return JSON.parse(raw) as WormSegment;
    } catch {
      return null;
    }
  }

  list(): WormSegment[] {
    const out: WormSegment[] = [];
    let names: string[] = [];
    try { names = readdirSync(this.dir); } catch { return out; }
    for (const n of names) {
      if (!n.endsWith('.json')) continue;
      const id = n.slice(0, -5);
      if (!isValidSegmentId(id)) continue;
      try {
        const seg = JSON.parse(readFileSync(path.join(this.dir, n), 'utf8')) as WormSegment;
        out.push(seg);
      } catch { /* 损坏文件跳过 */ }
    }
    return out.sort((a, b) => a.seq - b.seq);
  }

  count(): number {
    return this.list().length;
  }
}

let _store: WormStore | null = null;
export function getWormStore(): WormStore {
  if (_store) return _store;
  if (process.env.WORM_BACKEND === 'fs') {
    _store = new FileWormStore();
  } else {
    _store = new MemoryWormStore();
  }
  return _store;
}
export function __resetWormStore(): void {
  if (_store instanceof MemoryWormStore) _store.__clear();
  _store = null;
}
