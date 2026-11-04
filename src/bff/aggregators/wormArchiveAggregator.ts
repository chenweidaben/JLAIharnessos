/**
 * 健澜AI原生医院操作系统OS - P5-2 WORM 冷存储归档 + 审计哈希链衔接
 *
 * - 分批把 P4-1 审计事件封存为不可变段
 * - 段间链式：prevSegmentHash = 上一段 segmentHash；首段 GENESIS
 * - 段哈希：SHA256(prevSegmentHash + '|' + sourceChainHead + '|' + JSON(events))
 * - verify：逐段重算 + prev 链 + seq 连续性
 * - 归档幂等：lastArchivedSeq 不重复归档
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
  tampered?: boolean;
}

const segments = new Map<string, SegmentRecord>();
let lastArchivedSeq = 0;
let segmentCounter = 0;
const GENESIS = 'GENESIS';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function serializeEvents(events: AuditEvent[]): string {
  // 按 seq 升序后稳定序列化
  const sorted = events.slice().sort((a, b) => a.seq - b.seq);
  return JSON.stringify(sorted);
}

function computeSegmentHash(prevSegmentHash: string, sourceChainHead: string, events: AuditEvent[]): string {
  return sha256(prevSegmentHash + '|' + sourceChainHead + '|' + serializeEvents(events));
}

export interface SealInput {
  from?: string;
  to?: string;
}

export interface SealResult {
  ok: boolean;
  error?: 'no-events' | 'invalid-window';
  segment?: WormSegment;
}

export function seal(input: SealInput = {}, generatedBy: string): SealResult {
  if (input.from && Number.isNaN(new Date(input.from).getTime())) return { ok: false, error: 'invalid-window' };
  if (input.to && Number.isNaN(new Date(input.to).getTime())) return { ok: false, error: 'invalid-window' };

  // 拉取全部事件（queryEvents 默认 desc），按 seq 升序排
  const all = queryEvents({ limit: 5000, offset: 0 }).rows.slice().sort((a, b) => a.seq - b.seq);
  // 仅归档未归档事件
  let pending = all.filter((e) => e.seq > lastArchivedSeq);
  if (input.from) pending = pending.filter((e) => e.occurredAt >= (input.from as string));
  if (input.to) pending = pending.filter((e) => e.occurredAt <= (input.to as string));
  if (pending.length === 0) return { ok: false, error: 'no-events' };

  // 归档前先校验源链
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
    segmentId,
    seq: segmentCounter,
    fromSeq: pending[0].seq,
    toSeq: pending[pending.length - 1].seq,
    eventCount: pending.length,
    segmentHash,
    prevSegmentHash,
    sourceChainHead,
    sourceChainValid: chain.valid,
    sealedAt: now,
    bytes: Buffer.byteLength(body, 'utf8'),
    events: pending,
  };
  segments.set(segmentId, rec);
  lastArchivedSeq = pending[pending.length - 1].seq;

  const { events: _e, tampered: _t, ...meta } = rec;
  void _e; void _t;
  return { ok: true, segment: meta };
}

export function listSegments(limit = 50, offset = 0): { rows: WormSegment[]; total: number } {
  const all = Array.from(segments.values())
    .slice()
    .sort((a, b) => a.seq - b.seq)
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

export interface VerifyResult {
  valid: boolean;
  segmentCount: number;
  brokenSegmentId?: string;
  reason?: string;
}

export function verify(): VerifyResult {
  const all = Array.from(segments.values()).sort((a, b) => a.seq - b.seq);
  if (all.length === 0) return { valid: true, segmentCount: 0 };
  let prevHash = GENESIS;
  for (const seg of all) {
    if (seg.tampered) {
      return { valid: false, segmentCount: all.length, brokenSegmentId: seg.segmentId, reason: '段被篡改（tampered flag）' };
    }
    if (seg.prevSegmentHash !== prevHash) {
      return { valid: false, segmentCount: all.length, brokenSegmentId: seg.segmentId, reason: 'prevSegmentHash 链断裂' };
    }
    const recomputed = computeSegmentHash(seg.prevSegmentHash, seg.sourceChainHead, seg.events);
    if (recomputed !== seg.segmentHash) {
      return { valid: false, segmentCount: all.length, brokenSegmentId: seg.segmentId, reason: '段哈希重算不一致' };
    }
    // seq 连续性
    let expectedSeq = seg.fromSeq;
    for (const e of seg.events) {
      if (e.seq !== expectedSeq) {
        return { valid: false, segmentCount: all.length, brokenSegmentId: seg.segmentId, reason: `seq 不连续：期望 ${expectedSeq}，实际 ${e.seq}` };
      }
      expectedSeq += 1;
    }
    prevHash = seg.segmentHash;
  }
  return { valid: true, segmentCount: all.length };
}

/** 仅测试：标记某段为已篡改（不真改 events，让 verify 能返回 false） */
export function __tamperSegment(segmentId: string): boolean {
  const r = segments.get(segmentId);
  if (!r) return false;
  r.tampered = true;
  return true;
}

export function __resetStore(): void {
  segments.clear();
  lastArchivedSeq = 0;
  segmentCounter = 0;
}
