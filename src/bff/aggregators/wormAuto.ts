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

export function tick(): TickResult {
  const cfg = getAutoConfig();
  if (!cfg.enabled) return { sealed: false, reason: 'disabled' };
  const pending = queryAuditEventsCount();
  if (pending === 0) return { sealed: false, reason: 'no-events' };
  const now = Date.now();
  if (cfg.lastSealAt) {
    // 语义：距上次 seal 超 intervalMs「或」待归档事件数 ≥ threshold，二者任一成立即封段。
    // 不能先判「间隔未到且未到阈值」再单独用阈值拦截，否则时间窗永远无法在低事件量时触发。
    const elapsed = now - new Date(cfg.lastSealAt).getTime();
    const intervalDue = Number.isFinite(elapsed) && elapsed >= cfg.intervalMs;
    const thresholdDue = pending >= cfg.threshold;
    if (!intervalDue && !thresholdDue) {
      return { sealed: false, reason: 'below-threshold' };
    }
  }
  const r = seal({});
  if (!r.ok) return { sealed: false, reason: 'no-events' };
  setAutoConfig({ lastSealAt: new Date().toISOString() });
  return { sealed: true, segmentId: r.segment!.segmentId };
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

export function rebuildIndex(): SegmentIndexEntry[] {
  const store = getWormStore();
  const segs = store.list();
  const entries: SegmentIndexEntry[] = [];
  for (const s of segs) {
    const evts = getSegmentEvents(s.segmentId) ?? [];
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
  return entries;
}

export function loadIndex(): SegmentIndexEntry[] {
  const p = indexFilePath();
  if (!existsSync(p)) return rebuildIndex();
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as SegmentIndexEntry[];
  } catch {
    return rebuildIndex();
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
}

export function search(q: SearchQuery): SearchResult {
  let index = loadIndex();
  // 索引与磁盘段数不一致 → 重建（seal 后未写索引）
  const store = getWormStore();
  if (index.length !== store.count()) index = rebuildIndex();
  // 先用索引缩小候选段
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
  const scannedSegments = candidates.length;
  // 解密候选段逐事件过滤
  const all: AuditEvent[] = [];
  for (const c of candidates) {
    const evts = getSegmentEvents(c.segmentId) ?? [];
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
  // 分页参数防御：?limit=abc / 负数 / 0 不得静默返回空页
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
  };
}
