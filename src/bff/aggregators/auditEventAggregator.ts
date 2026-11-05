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
  /** P5-7：标记为系统/调度事件，不进入 WORM 待归档池（仅内存标记，不参与哈希） */
  excludeFromArchive?: boolean;
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

export function recordEvent(input: RecordInput): AuditEvent {
  if (!input.actorId) throw new AuditError(400, 'actorId 必填');
  if (!input.module) throw new AuditError(400, 'module 必填');
  if (!input.resourceType) throw new AuditError(400, 'resourceType 必填');
  if (!input.resourceId) throw new AuditError(400, 'resourceId 必填');
  const actorRole = pick(input.actorRole, ROLES, 'actorRole');
  const action = pick(input.action, ACTIONS, 'action');
  const result = pick(input.result, RESULTS, 'result');

  const prev = events[events.length - 1];
  const prevHash = prev ? prev.hash : GENESIS;
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
  events.push(evt);
  return evt;
}

export interface QueryInput {
  actorId?: string; module?: string; action?: string; result?: string;
  patientId?: string; from?: string; to?: string; limit?: number; offset?: number;
}

export function queryEvents(q: QueryInput): { rows: AuditEvent[]; total: number } {
  let arr = [...events];
  if (q.actorId) arr = arr.filter((e) => e.actorId === q.actorId);
  if (q.module) arr = arr.filter((e) => e.module === q.module);
  if (q.action) arr = arr.filter((e) => e.action === q.action);
  if (q.result) arr = arr.filter((e) => e.result === q.result);
  if (q.patientId) arr = arr.filter((e) => e.patientId === q.patientId);
  if (q.from) arr = arr.filter((e) => e.occurredAt >= (q.from as string));
  if (q.to) arr = arr.filter((e) => e.occurredAt <= (q.to as string));
  arr.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : b.seq - a.seq));
  const total = arr.length;
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  const offset = Math.max(q.offset ?? 0, 0);
  return { rows: arr.slice(offset, offset + limit), total };
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

export function verifyChain(): { valid: boolean; brokenAt?: number; totalEvents: number } {
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

/** 仅测试用：直接篡改某条事件（用于 verify-chain 检测） */
export function __tamper(seq: number, patch: Partial<AuditEvent>): void {
  const e = events.find((x) => x.seq === seq);
  if (!e) throw new AuditError(404, `seq=${seq} 不存在`);
  Object.assign(e, patch);
}

export function __resetStore(): void { events.length = 0; }
