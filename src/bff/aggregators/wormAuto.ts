/**
 * 健澜AI原生医院操作系统OS - P5-6 WORM 自动归档调度 + 跨段冷数据检索
 *
 * - 调度配置持久化到 <WORM_STORE_DIR>/_auto.json
 * - 索引 <dir>/_index.json：每段 actorIds/patientIds/actions/modules/fromTs/toTs
 * - 检索：跨段解密后按条件过滤
 *
 * 【架构边界（独立验证确认）】
 * 审计事件聚合器（auditEventAggregator）是进程内存态，不跨进程共享。
 * 因此跨进程保证的是：①段持久化到磁盘；②段间链式衔接（prevSegmentHash）；
 * ③_auto.json 配置读回；④_index.json 索引读回/重建。
 * 跨进程不能继续归档新事件——B 进程 audit 内存为空，pending=0，seal() 返 no-events。
 * 这不是缺陷，是当前内存架构的预期行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { AuditEvent } from './auditEventAggregator.js';
import { getSegmentEvents, seal, queryAuditEventsCount } from './wormArchiveAggregator.js';
import { getWormStore, FileWormStore } from './wormStore.js';

export interface AutoConfig {
  enabled: boolean;
  intervalMs: number;
  threshold: number;
  lastSealAt: string | null;
}

const DEFAULT_CONFIG: AutoConfig = {
  enabled: false,
  intervalMs: 60_000,
  threshold: 10,
  lastSealAt: null,
};

function autoFilePath(): string {
  const store = getWormStore();
  const dir = store instanceof FileWormStore ? store.dir : path.join('logs', 'worm-store');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, '_auto.json');
}

export function getAutoConfig(): AutoConfig {
  const p = autoFilePath();
  if (!existsSync(p)) return { ...DEFAULT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as Partial<AutoConfig>;
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setAutoConfig(cfg: Partial<AutoConfig>): AutoConfig {
  const cur = getAutoConfig();
  // 只接受显式给出的合法字段：undefined/非法值不得覆盖已有配置
  // （路由层会把未提供的字段显式传成 undefined，若直接展开会让 enabled/threshold 被清空回默认）
  const patch: Partial<AutoConfig> = {};
  if (typeof cfg.enabled === 'boolean') patch.enabled = cfg.enabled;
  if (typeof cfg.intervalMs === 'number' && Number.isFinite(cfg.intervalMs)) {
    patch.intervalMs = Math.max(1_000, Math.floor(cfg.intervalMs));
  }
  if (typeof cfg.threshold === 'number' && Number.isFinite(cfg.threshold)) {
    patch.threshold = Math.max(1, Math.floor(cfg.threshold));
  }
  if (typeof cfg.lastSealAt === 'string' || cfg.lastSealAt === null) {
    patch.lastSealAt = cfg.lastSealAt;
  }
  const next: AutoConfig = { ...cur, ...patch };
  writeFileSync(autoFilePath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export interface TickResult {
  sealed: boolean;
  reason?: 'no-events' | 'disabled' | 'interval-not-elapsed' | 'below-threshold';
  segmentId?: string;
}

export interface TickHistoryEntry {
  at: string;
  sealed: boolean;
  reason?: string;
  pendingBefore: number;
  segmentsBefore: number;
  segmentsAfter: number;
  intervalDue: boolean;
  thresholdDue: boolean;
  durationMs: number;
}

const HISTORY_MAX = 1000;
const tickHistory: TickHistoryEntry[] = [];

export function __resetTickHistory(): void { tickHistory.length = 0; }

function historyFilePath(): string {
  const store = getWormStore();
  const dir = store instanceof FileWormStore ? store.dir : path.join('logs', 'worm-store');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, '_history.json');
}

function loadHistoryDisk(): void {
  const p = historyFilePath();
  if (!existsSync(p)) return;
  try {
    const arr = JSON.parse(readFileSync(p, 'utf8')) as TickHistoryEntry[];
    tickHistory.length = 0;
    tickHistory.push(...arr);
  } catch { /* 忽略损坏 */ }
}

function appendHistory(entry: TickHistoryEntry): void {
  loadHistoryDisk();
  tickHistory.push(entry);
  while (tickHistory.length > HISTORY_MAX) tickHistory.shift();
  writeFileSync(historyFilePath(), JSON.stringify(tickHistory, null, 2), 'utf8');
}

export function listTickHistory(limit = 50, offset = 0): { rows: TickHistoryEntry[]; total: number } {
  loadHistoryDisk();
  // 倒序：最新在前
  const arr = tickHistory.slice().reverse();
  const total = arr.length;
  const lim = Math.min(Math.max(Math.floor(limit) || 50, 1), 500);
  const off = Math.max(Math.floor(offset) || 0, 0);
  return { rows: arr.slice(off, off + lim), total };
}

export async function tick(): Promise<TickResult> {
  const cfg = getAutoConfig();
  const t0 = performance.now();
  const store = getWormStore();
  const segmentsBefore = store.count();
  let sealed = false;
  let reason: TickResult['reason'] | undefined;
  let segmentId: string | undefined;
  let pendingBefore = 0;
  let intervalDue = false;
  let thresholdDue = false;

  if (!cfg.enabled) {
    reason = 'disabled';
  } else {
    pendingBefore = queryAuditEventsCount();
    if (pendingBefore === 0) {
      reason = 'no-events';
    } else {
      const now = Date.now();
      if (cfg.lastSealAt) {
        const elapsed = now - new Date(cfg.lastSealAt).getTime();
        intervalDue = Number.isFinite(elapsed) && elapsed >= cfg.intervalMs;
      } else {
        intervalDue = true;
      }
      thresholdDue = pendingBefore >= cfg.threshold;
      if (!intervalDue && !thresholdDue) {
        reason = 'below-threshold';
      } else {
        const r = await seal({});
        if (!r.ok) {
          reason = 'no-events';
        } else {
          sealed = true;
          segmentId = r.segment!.segmentId;
          setAutoConfig({ lastSealAt: new Date().toISOString() });
        }
      }
    }
  }

  const durationMs = Number((performance.now() - t0).toFixed(2));
  const segmentsAfter = store.count();
  appendHistory({
    at: new Date().toISOString(),
    sealed, reason, pendingBefore, segmentsBefore, segmentsAfter,
    intervalDue, thresholdDue, durationMs,
  });

  const out: TickResult = { sealed };
  if (reason) out.reason = reason;
  if (segmentId) out.segmentId = segmentId;
  return out;
}

/* ------------------------------ 检索索引 ------------------------------ */

export interface SegmentIndexEntry {
  segmentId: string;
  actorIds: string[];
  patientIds: string[];
  actions: string[];
  modules: string[];
  fromTs: string;
  toTs: string;
}

function indexFilePath(): string {
  const store = getWormStore();
  const dir = store instanceof FileWormStore ? store.dir : path.join('logs', 'worm-store');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, '_index.json');
}

let indexCache: SegmentIndexEntry[] = [];

export async function rebuildIndex(): Promise<SegmentIndexEntry[]> {
  const store = getWormStore();
  const segs = store.list();
  const entries: SegmentIndexEntry[] = [];
  for (const s of segs) {
    const evts = (await getDecrypted(s.segmentId)) ?? [];
    entries.push({
      segmentId: s.segmentId,
      actorIds: Array.from(new Set(evts.map((e) => e.actorId))),
      patientIds: Array.from(new Set(evts.map((e) => e.patientId ?? '').filter(Boolean))),
      actions: Array.from(new Set(evts.map((e) => e.action))),
      modules: Array.from(new Set(evts.map((e) => e.module))),
      fromTs: evts[0]?.occurredAt ?? s.sealedAt,
      toTs: evts[evts.length - 1]?.occurredAt ?? s.sealedAt,
    });
  }
  writeFileSync(indexFilePath(), JSON.stringify(entries, null, 2), 'utf8');
  indexCache = entries;
  return entries;
}

export function __resetIndexCache(): void { indexCache = []; }

export async function loadIndex(): Promise<SegmentIndexEntry[]> {
  // 内存索引缓存：避免每次 search 都读 _index.json
  if (indexCache.length > 0) return indexCache;
  const p = indexFilePath();
  if (!existsSync(p)) {
    indexCache = await rebuildIndex();
    return indexCache;
  }
  try {
    indexCache = JSON.parse(readFileSync(p, 'utf8')) as SegmentIndexEntry[];
    return indexCache;
  } catch {
    indexCache = await rebuildIndex();
    return indexCache;
  }
}

/* ------------------------------ 跨段检索 ------------------------------ */

export interface SearchQuery {
  actorId?: string;
  patientId?: string;
  action?: string;
  module?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  rows: AuditEvent[];
  total: number;
  scannedSegments: number;
  indexHit: boolean;
  candidateSegments: number;
  decryptedSegments: number;
}

// LRU：解密后的段事件按 segmentId 缓存（容量 32）
const DECRYPT_CAP = 32;
const decryptCache = new Map<string, AuditEvent[]>();

export function __resetDecryptCache(): void { decryptCache.clear(); }

/** 仅供 benchmark：直接把解密后的事件塞进 LRU，绕过真实加解密。 */
export function __injectDecryptedForBench(segmentId: string, evts: AuditEvent[]): void {
  decryptCache.set(segmentId, evts);
}

async function getDecrypted(segmentId: string): Promise<AuditEvent[] | null> {
  const hit = decryptCache.get(segmentId);
  if (hit) {
    decryptCache.delete(segmentId);
    decryptCache.set(segmentId, hit);
    return hit;
  }
  const evts = await getSegmentEvents(segmentId);
  if (!evts) return null;
  decryptCache.set(segmentId, evts);
  while (decryptCache.size > DECRYPT_CAP) {
    const first = decryptCache.keys().next().value;
    if (first === undefined) break;
    decryptCache.delete(first);
  }
  return evts;
}

export async function search(q: SearchQuery): Promise<SearchResult> {
  let index = await loadIndex();
  const store = getWormStore();
  // 索引与磁盘段数不一致 → 重建（seal 后未写索引）
  if (index.length !== store.count()) index = await rebuildIndex();
  let candidates = index;
  let indexHit = false;
  if (q.actorId || q.patientId || q.action || q.module || q.from || q.to) {
    indexHit = true;
    candidates = index.filter((e) => {
      if (q.actorId && !e.actorIds.includes(q.actorId)) return false;
      if (q.patientId && !e.patientIds.includes(q.patientId)) return false;
      if (q.action && !e.actions.includes(q.action)) return false;
      if (q.module && !e.modules.includes(q.module)) return false;
      if (q.from && e.toTs < q.from) return false;
      if (q.to && e.fromTs > q.to) return false;
      return true;
    });
  }
  const scannedSegments = index.length;
  const candidateSegments = candidates.length;
  let decryptedSegments = 0;
  const all: AuditEvent[] = [];
  for (const c of candidates) {
    const evts = (await getDecrypted(c.segmentId)) ?? [];
    decryptedSegments += 1;
    for (const e of evts) {
      if (q.actorId && e.actorId !== q.actorId) continue;
      if (q.patientId && e.patientId !== q.patientId) continue;
      if (q.action && e.action !== q.action) continue;
      if (q.module && e.module !== q.module) continue;
      if (q.from && e.occurredAt < q.from) continue;
      if (q.to && e.occurredAt > q.to) continue;
      all.push(e);
    }
  }
  all.sort((a, b) => a.seq - b.seq);
  const MAX_LIMIT = 500;
  const limitRaw = typeof q.limit === 'number' ? q.limit : 50;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : 50;
  const offsetRaw = typeof q.offset === 'number' ? q.offset : 0;
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
  return {
    rows: all.slice(offset, offset + limit),
    total: all.length,
    scannedSegments,
    indexHit,
    candidateSegments,
    decryptedSegments,
  };
}
