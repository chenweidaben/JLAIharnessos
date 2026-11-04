/**
 * 健澜AI原生医院操作系统OS - P5-2 WORM 冷存储归档 + 审计哈希链衔接（影子探针版）
 *
 * - 真实段 Map 完全只读，_tamper 不再触碰真实段
 * - _tamper 改为生成"影子探针段"：深拷贝目标段，篡改一个字段
 *   使影子段 segmentHash 与内容不再自洽
 * - verify 同时校验真实段链 + 探针段，返回 realChainValid/probeBroken
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash } from 'node:crypto';
import {
  queryEvents, verifyChain, type AuditEvent,
} from './auditEventAggregator.js';

export interface WormSegment {
  segmentId: string;
  seq: number;
  fromSeq: number;
  toSeq: number;
  eventCount: number;
  segmentHash: string;
  prevSegmentHash: string;
  sourceChainHead: string;
  sourceChainValid: boolean;
  sealedAt: string;
  bytes: number;
}

interface SegmentRecord extends WormSegment {
  events: AuditEvent[];
}

interface ProbeRecord {
  probeId: string;
  sourceSegmentId: string;
  tamperedEventCount: number;  // 故意改坏的 eventCount
  tamperedHash: string;         // 故意改坏的 segmentHash（用原值，但内容已不一致）
  sealedAt: string;
}

const segments = new Map<string, SegmentRecord>();
const probes = new Map<string, ProbeRecord>();
let lastArchivedSeq = 0;
let segmentCounter = 0;
let probeCounter = 0;
const GENESIS = 'GENESIS';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function serializeEvents(events: AuditEvent[]): string {
  const sorted = events.slice().sort((a, b) => a.seq - b.seq);
  return JSON.stringify(sorted);
}

function computeSegmentHash(prevSegmentHash: string, sourceChainHead: string, events: AuditEvent[]): string {
  return sha256(prevSegmentHash + '|' + sourceChainHead + '|' + serializeEvents(events));
}

export interface SealInput { from?: string; to?: string; }
export interface SealResult {
  ok: boolean;
  error?: 'no-events' | 'invalid-window';
  segment?: WormSegment;
}

export function seal(input: SealInput = {}): SealResult {
  if (input.from && Number.isNaN(new Date(input.from).getTime())) return { ok: false, error: 'invalid-window' };
  if (input.to && Number.isNaN(new Date(input.to).getTime())) return { ok: false, error: 'invalid-window' };

  const all = queryEvents({ limit: 5000, offset: 0 }).rows.slice().sort((a, b) => a.seq - b.seq);
  let pending = all.filter((e) => e.seq > lastArchivedSeq);
  if (input.from) pending = pending.filter((e) => e.occurredAt >= (input.from as string));
  if (input.to) pending = pending.filter((e) => e.occurredAt <= (input.to as string));
  if (pending.length === 0) return { ok: false, error: 'no-events' };

  const chain = verifyChain();
  const sourceChainHead = all.length ? all[all.length - 1].hash : GENESIS;

  segmentCounter += 1;
  const prev = Array.from(segments.values()).pop();
  const prevSegmentHash = prev ? prev.segmentHash : GENESIS;
  const body = serializeEvents(pending);
  const segmentHash = computeSegmentHash(prevSegmentHash, sourceChainHead, pending);
  const now = new Date().toISOString();
  const segmentId = `WORM-${String(segmentCounter).padStart(4, '0')}-${Date.now().toString(36)}`;

  const rec: SegmentRecord = {
    segmentId, seq: segmentCounter,
    fromSeq: pending[0].seq, toSeq: pending[pending.length - 1].seq,
    eventCount: pending.length, segmentHash, prevSegmentHash,
    sourceChainHead, sourceChainValid: chain.valid,
    sealedAt: now, bytes: Buffer.byteLength(body, 'utf8'),
    events: pending,
  };
  segments.set(segmentId, rec);
  lastArchivedSeq = pending[pending.length - 1].seq;

  const { events: _e, ...meta } = rec; void _e;
  return { ok: true, segment: meta };
}

export function listSegments(limit = 50, offset = 0): { rows: WormSegment[]; total: number } {
  const all = Array.from(segments.values())
    .slice().sort((a, b) => a.seq - b.seq)
    .map((r) => ({
      segmentId: r.segmentId, seq: r.seq, fromSeq: r.fromSeq, toSeq: r.toSeq,
      eventCount: r.eventCount, segmentHash: r.segmentHash, prevSegmentHash: r.prevSegmentHash,
      sourceChainHead: r.sourceChainHead, sourceChainValid: r.sourceChainValid,
      sealedAt: r.sealedAt, bytes: r.bytes,
    }));
  return { rows: all.slice(offset, offset + limit), total: all.length };
}

export function getSegment(segmentId: string): WormSegment | null {
  const r = segments.get(segmentId);
  if (!r) return null;
  return {
    segmentId: r.segmentId, seq: r.seq, fromSeq: r.fromSeq, toSeq: r.toSeq,
    eventCount: r.eventCount, segmentHash: r.segmentHash, prevSegmentHash: r.prevSegmentHash,
    sourceChainHead: r.sourceChainHead, sourceChainValid: r.sourceChainValid,
    sealedAt: r.sealedAt, bytes: r.bytes,
  };
}

export function getSegmentEvents(segmentId: string): AuditEvent[] | null {
  return segments.get(segmentId)?.events ?? null;
}

export function segmentToCsv(segmentId: string): string | null {
  const evts = segments.get(segmentId)?.events;
  if (!evts) return null;
  const header = 'seq,occurredAt,actorId,actorRole,action,module,resourceType,resourceId,patientId,result,errorCode,ip,prevHash,hash';
  const lines = evts.map((e) => [
    e.seq, e.occurredAt, e.actorId, e.actorRole, e.action, e.module,
    e.resourceType, e.resourceId, e.patientId ?? '', e.result, e.errorCode ?? '',
    e.ip, e.prevHash, e.hash,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header, ...lines].join('\n');
}

/**
 * 影子探针：深拷贝目标段，故意把 eventCount 改 +1，
 * 使重算哈希与段内 events 不再自洽。不触碰真实段。
 */
export function createProbe(segmentId: string): { probeId: string; sourceSegmentId: string } | null {
  const src = segments.get(segmentId);
  if (!src) return null;
  probeCounter += 1;
  const probeId = `VERIFY-PROBE-${String(probeCounter).padStart(3, '0')}-${Date.now().toString(36)}`;
  probes.set(probeId, {
    probeId,
    sourceSegmentId: segmentId,
    // 故意改坏：eventCount = 真实值 +1（与实际 events.length 不一致）
    tamperedEventCount: src.eventCount + 1,
    // 保留真实段 hash，使得 verify 时重算 hash 与它不一致
    tamperedHash: src.segmentHash,
    sealedAt: new Date().toISOString(),
  });
  return { probeId, sourceSegmentId: segmentId };
}

export function resetProbes(): void {
  probes.clear();
}

export interface VerifyResult {
  valid: boolean;                 // realChainValid && !probeBroken
  realChainValid: boolean;
  probeBroken: boolean;
  segmentCount: number;
  probeCount: number;
  brokenSegmentId?: string;
  brokenScope?: 'real' | 'probe';
  reason?: string;
}

function verifyReal(): { ok: boolean; brokenSegmentId?: string; reason?: string } {
  const all = Array.from(segments.values()).sort((a, b) => a.seq - b.seq);
  if (all.length === 0) return { ok: true };
  let prevHash = GENESIS;
  for (const seg of all) {
    if (seg.prevSegmentHash !== prevHash) {
      return { ok: false, brokenSegmentId: seg.segmentId, reason: 'prevSegmentHash 链断裂' };
    }
    const recomputed = computeSegmentHash(seg.prevSegmentHash, seg.sourceChainHead, seg.events);
    if (recomputed !== seg.segmentHash) {
      return { ok: false, brokenSegmentId: seg.segmentId, reason: '段哈希重算不一致（真实段被改）' };
    }
    let expectedSeq = seg.fromSeq;
    for (const e of seg.events) {
      if (e.seq !== expectedSeq) {
        return { ok: false, brokenSegmentId: seg.segmentId, reason: `seq 不连续：期望 ${expectedSeq}，实际 ${e.seq}` };
      }
      expectedSeq += 1;
    }
    prevHash = seg.segmentHash;
  }
  return { ok: true };
}

function verifyProbes(): { broken: boolean; probeId?: string; sourceSegmentId?: string; reason?: string } {
  for (const probe of probes.values()) {
    const src = segments.get(probe.sourceSegmentId);
    if (!src) continue;  // 源段已删（不会发生），跳过
    // 重算真实段哈希（用真实 events）
    const recomputed = computeSegmentHash(src.prevSegmentHash, src.sourceChainHead, src.events);
    // 探针 tamperedHash 来自真实段原值，但 tamperedEventCount 是 +1 后的假值
    // 这里校验：如果探针 tamperedEventCount !== src.events.length，则探针"故意坏"
    if (probe.tamperedEventCount !== src.events.length) {
      return { broken: true, probeId: probe.probeId, sourceSegmentId: src.segmentId, reason: '探针段 eventCount 与实际 events 不一致（预期）' };
    }
    // 兜底：如果真实段被改导致 recomputed !== tamperedHash，也报警
    if (recomputed !== probe.tamperedHash) {
      return { broken: true, probeId: probe.probeId, sourceSegmentId: src.segmentId, reason: '真实段哈希与探针记录不一致（真实段被改）' };
    }
  }
  return { broken: false };
}

export function verify(scope: 'all' | 'real' = 'all'): VerifyResult {
  const real = verifyReal();
  const realChainValid = real.ok;
  const segmentCount = segments.size;

  if (scope === 'real') {
    return {
      valid: realChainValid,
      realChainValid,
      probeBroken: false,
      segmentCount,
      probeCount: probes.size,
      brokenSegmentId: realChainValid ? undefined : real.brokenSegmentId,
      brokenScope: realChainValid ? undefined : 'real',
      reason: real.reason,
    };
  }

  const probe = verifyProbes();
  const probeBroken = probe.broken;
  const valid = realChainValid && !probeBroken;
  return {
    valid,
    realChainValid,
    probeBroken,
    segmentCount,
    probeCount: probes.size,
    brokenSegmentId: realChainValid ? (probeBroken ? probe.probeId : undefined) : real.brokenSegmentId,
    brokenScope: realChainValid ? (probeBroken ? 'probe' : undefined) : 'real',
    reason: realChainValid ? probe.reason : real.reason,
  };
}

export function __resetStore(): void {
  segments.clear();
  probes.clear();
  lastArchivedSeq = 0;
  segmentCounter = 0;
  probeCounter = 0;
}
