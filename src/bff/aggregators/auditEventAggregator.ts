/**
 * 健澜AI原生医院操作系统OS - P4-1 全链路审计日志（等保三级合规底座）
 *
 * - 每条 event 计算 hash = SHA256(prevHash + canonical(payload))
 * - prevHash = 上一条 event.hash；创世 event prevHash = 'GENESIS'
 * - verify-chain 遍历重算 hash，任一不一致返回 brokenAt
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomUUID } from 'node:crypto';
import { getAuditStore, __resetAuditStore, type AppendResult } from './auditEventStore';

export class AuditError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type ActorRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin' | 'patient' | 'system';
export type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'export' | 'forbidden' | 'view';
export type AuditResult = 'success' | 'failure' | 'forbidden';

export const ACTIONS: readonly AuditAction[] = ['login', 'logout', 'create', 'update', 'delete', 'approve', 'reject', 'export', 'forbidden', 'view'];
export const RESULTS: readonly AuditResult[] = ['success', 'failure', 'forbidden'];
export const ROLES: readonly ActorRole[] = ['doctor', 'nurse', 'pharmacist', 'admin', 'patient', 'system'];

export interface AuditEvent {
  eventId: string;
  seq: number;
  occurredAt: string;
  actorId: string;
  actorRole: ActorRole;
  action: AuditAction;
  module: string;
  resourceType: string;
  resourceId: string;
  patientId?: string;
  result: AuditResult;
  errorCode?: string;
  ip: string;
  userAgent: string;
  prevHash: string;
  hash: string;
}

const events: AuditEvent[] = [];
const GENESIS = 'GENESIS';

function pick<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw new AuditError(400, `${label} 非法：${String(v)}`);
  return v as T;
}

function canonical(e: Omit<AuditEvent, 'hash'>): string {
  // 固定字段顺序序列化（不含 hash 自身），保证跨语言可重算
  return JSON.stringify({
    eventId: e.eventId, seq: e.seq, occurredAt: e.occurredAt,
    actorId: e.actorId, actorRole: e.actorRole, action: e.action, module: e.module,
    resourceType: e.resourceType, resourceId: e.resourceId,
    patientId: e.patientId ?? null, result: e.result, errorCode: e.errorCode ?? null,
    ip: e.ip, userAgent: e.userAgent, prevHash: e.prevHash,
  });
}

function computeHash(prevHash: string, payload: string): string {
  return createHash('sha256').update(prevHash + '|' + payload, 'utf8').digest('hex');
}

export interface RecordInput {
  actorId: string; actorRole: unknown; action: unknown; module: string;
  resourceType: string; resourceId: string; patientId?: string;
  result: unknown; errorCode?: string; ip?: string; userAgent?: string; occurredAt?: string;
}

export async function recordEvent(input: RecordInput): Promise<{ event: AuditEvent; result: AppendResult }> {
  if (!input.actorId) throw new AuditError(400, 'actorId 必填');
  if (!input.module) throw new AuditError(400, 'module 必填');
  if (!input.resourceType) throw new AuditError(400, 'resourceType 必填');
  if (!input.resourceId) throw new AuditError(400, 'resourceId 必填');
  const actorRole = pick(input.actorRole, ROLES, 'actorRole');
  const action = pick(input.action, ACTIONS, 'action');
  const result = pick(input.result, RESULTS, 'result');

  const prev = events[events.length - 1];
  const prevHash = prev ? prev.hash : GENESIS;
  // seq 占位：Memory store 用 events.length+1；Pg store 用 SQL MAX(seq)+1
  const seq = events.length + 1;
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const base: Omit<AuditEvent, 'hash'> = {
    eventId: randomUUID(), seq, occurredAt,
    actorId: input.actorId, actorRole, action, module: input.module,
    resourceType: input.resourceType, resourceId: input.resourceId,
    patientId: input.patientId, result, errorCode: input.errorCode,
    ip: input.ip ?? '0.0.0.0', userAgent: input.userAgent ?? 'unknown',
    prevHash,
  };
  const hash = computeHash(prevHash, canonical(base));
  const evt: AuditEvent = { ...base, hash };

  // P5-13：写穿。成功才进 pending 池；失败走 fallback，不进 pending。
  const store = getAuditStore();
  const r = await store.append(evt);
  if (r.ok && r.persisted) {
    // Pg 路径用 DB RETURNING 的 seq 覆盖内存占位 seq，保证 pending 池与 DB 一致。
    const persisted = r.seq ? { ...evt, seq: r.seq } : evt;
    events.push(persisted);
  }
  return { event: evt, result: r };
}

export interface QueryInput {
  actorId?: string; module?: string; action?: string; result?: string;
  patientId?: string; from?: string; to?: string; limit?: number; offset?: number;
}

export async function queryEvents(q: QueryInput): Promise<{ rows: AuditEvent[]; total: number }> {
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  const offset = Math.max(q.offset ?? 0, 0);
  // P5-13：所有过滤进 SQL WHERE，total 用 count(*)，分页用 LIMIT/OFFSET
  // 不在应用层二次过滤，避免 total 与分页错乱。
  // Memory 实现忽略 WHERE（单测用），返回全量由路由层再过滤分页。
  const store = getAuditStore();
  if (store.kind === 'pg') {
    const r = await store.query({
      limit, offset,
      actorId: q.actorId, module: q.module, action: q.action, result: q.result,
      patientId: q.patientId, from: q.from, to: q.to,
    });
    return r;
  }
  // Memory 路径：返回全量后在内存过滤+分页（保持单测语义）
  const r = await store.query({ limit: 10_000, offset: 0 });
  let rows = r.rows;
  if (q.actorId) rows = rows.filter((e) => e.actorId === q.actorId);
  if (q.module) rows = rows.filter((e) => e.module === q.module);
  if (q.action) rows = rows.filter((e) => e.action === q.action);
  if (q.result) rows = rows.filter((e) => e.result === q.result);
  if (q.patientId) rows = rows.filter((e) => e.patientId === q.patientId);
  if (q.from) rows = rows.filter((e) => e.occurredAt >= (q.from as string));
  if (q.to) rows = rows.filter((e) => e.occurredAt <= (q.to as string));
  return { rows: rows.slice(offset, offset + limit), total: rows.length };
}

export function exportCsv(): string {
  const header = 'seq,occurredAt,actorId,actorRole,action,module,resourceType,resourceId,patientId,result,errorCode,ip,prevHash,hash';
  const lines = events.map((e) => [
    e.seq, e.occurredAt, e.actorId, e.actorRole, e.action, e.module,
    e.resourceType, e.resourceId, e.patientId ?? '', e.result, e.errorCode ?? '',
    e.ip, e.prevHash, e.hash,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header, ...lines].join('\n');
}

/** 同步版本：基于内存 pending 池重算哈希链（seal 路径用） */
export function verifyChainSync(): { valid: boolean; brokenAt?: number; totalEvents: number } {
  let prevHash = GENESIS;
  for (const e of events) {
    if (e.prevHash !== prevHash) return { valid: false, brokenAt: e.seq, totalEvents: events.length };
    const base: Omit<AuditEvent, 'hash'> = {
      eventId: e.eventId, seq: e.seq, occurredAt: e.occurredAt,
      actorId: e.actorId, actorRole: e.actorRole, action: e.action, module: e.module,
      resourceType: e.resourceType, resourceId: e.resourceId,
      patientId: e.patientId, result: e.result, errorCode: e.errorCode,
      ip: e.ip, userAgent: e.userAgent, prevHash: e.prevHash,
    };
    const recomputed = computeHash(e.prevHash, canonical(base));
    if (recomputed !== e.hash) return { valid: false, brokenAt: e.seq, totalEvents: events.length };
    prevHash = e.hash;
  }
  return { valid: true, totalEvents: events.length };
}

/** 异步版本：流式从 store 读全量重算（/audit/events/verify-chain 路由用） */
export async function verifyChain(): Promise<{ valid: boolean; brokenAt?: number; totalEvents: number }> {
  let prevHash = GENESIS;
  let total = 0;
  const store = getAuditStore();
  for await (const batch of store.streamAll()) {
    for (const e of batch) {
      total += 1;
      if (e.prevHash !== prevHash) return { valid: false, brokenAt: e.seq, totalEvents: total };
      const base: Omit<AuditEvent, 'hash'> = {
        eventId: e.eventId, seq: e.seq, occurredAt: e.occurredAt,
        actorId: e.actorId, actorRole: e.actorRole, action: e.action, module: e.module,
        resourceType: e.resourceType, resourceId: e.resourceId,
        patientId: e.patientId, result: e.result, errorCode: e.errorCode,
        ip: e.ip, userAgent: e.userAgent, prevHash: e.prevHash,
      };
      const recomputed = computeHash(e.prevHash, canonical(base));
      if (recomputed !== e.hash) return { valid: false, brokenAt: e.seq, totalEvents: total };
      prevHash = e.hash;
    }
  }
  return { valid: true, totalEvents: total };
}

/** 仅测试用：直接篡改某条事件（用于 verify-chain 检测） */
export function __tamper(seq: number, patch: Partial<AuditEvent>): void {
  const e = events.find((x) => x.seq === seq);
  if (!e) throw new AuditError(404, `seq=${seq} 不存在`);
  Object.assign(e, patch);
}

export function __resetStore(): void {
  events.length = 0;
  // P5-13：同步清空全局 store，避免跨用例 MemoryAuditStore rows 累积导致 seq 漂移
  //（Memory store 用 rows.length+1 分配 seq，不清空会导致 pending 首条 seq != lastArchivedSeq+1）。
  __resetAuditStore(null);
}

/** P5-13：暴露内存 pending 池（seal 路径用，避免每次 seal 查 DB） */
export function getPendingEvents(): AuditEvent[] { return [...events]; }

/** P5-13 测试用：直接往 pending 池注入事件（造 gap 场景） */
export function __injectPending(evt: AuditEvent): void { events.push(evt); }

/** P5-13 启动回填：把 store 中 seq > fromSeq 的事件灌回内存 pending 池。
 *  fromSeq 必须显式传（通常是 lastArchivedSeq），禁止默认 0。 */
export async function backfillPending(fromSeq: number): Promise<number> {
  if (!Number.isFinite(fromSeq) || fromSeq < 0) {
    throw new Error(`[audit] backfillPending: fromSeq must be >= 0, got ${fromSeq}`);
  }
  const store = getAuditStore();
  try {
    const rows = await store.backfill(fromSeq, 1000);
    for (const e of rows) events.push(e);
    if (rows.length > 0) {
      console.log(`[audit] backfilled ${rows.length} events (seq ${rows[0].seq}..${rows[rows.length - 1].seq}), lastArchivedSeq=${fromSeq}`);
    } else {
      console.log(`[audit] backfilled 0 events, lastArchivedSeq=${fromSeq}`);
    }
    return rows.length;
  } catch (err) {
    console.error(`[audit] backfill failed:`, err instanceof Error ? err.message : String(err));
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bffMetrics } = require('../observability/metrics') as typeof import('../observability/metrics');
      bffMetrics.auditPersistFailed.inc();
    } catch { /* ignore */ }
    return 0;
  }
}
