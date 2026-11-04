/**
 * 健澜AI原生医院操作系统OS - P4-5 操作回放与取证包导出
 *
 * - 按 actorId 时间线回放（正序）
 * - 按 patientId 反查所有访问过该患者的操作
 * - 生成不可变取证包（含哈希链校验结果），可 JSON/CSV 下载
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { queryEvents, verifyChain, type AuditEvent } from './auditEventAggregator.js';

export interface ForensicQuery {
  actorId?: string;
  patientId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ForensicPackage {
  packageId: string;
  generatedBy: string;
  generatedAt: string;
  query: Required<Pick<ForensicQuery, 'actorId' | 'patientId' | 'from' | 'to'>>;
  eventCount: number;
  hashChainValid: boolean;
  hashChainBrokenAt?: number;
  events: AuditEvent[];
}

const packages = new Map<string, ForensicPackage>();

let counter = 0;
function nextId(): string {
  counter += 1;
  return `FP-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function applyTimeFilter(rows: AuditEvent[], from?: string, to?: string): AuditEvent[] {
  if (!from && !to) return rows;
  const f = from ? new Date(from).getTime() : -Infinity;
  const t = to ? new Date(to).getTime() : Infinity;
  return rows.filter((r) => {
    const ts = new Date(r.occurredAt).getTime();
    return ts >= f && ts <= t;
  });
}

export function validateQuery(q: ForensicQuery): string | null {
  if (!q.actorId && !q.patientId) return 'actorId 与 patientId 至少给一个';
  if (q.from && Number.isNaN(new Date(q.from).getTime())) return 'from 不是合法 ISO 时间';
  if (q.to && Number.isNaN(new Date(q.to).getTime())) return 'to 不是合法 ISO 时间';
  return null;
}

export function replay(q: ForensicQuery): { rows: AuditEvent[]; total: number } {
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  const offset = Math.max(q.offset ?? 0, 0);
  // audit queryEvents 默认按 seq desc；这里正序
  const all = queryEvents({
    actorId: q.actorId,
    patientId: q.patientId,
    limit: 5000,
    offset: 0,
  }).rows;
  const timeFiltered = applyTimeFilter(all, q.from, q.to);
  // queryEvents 已按 seq desc，这里 reverse 成正序
  const asc = timeFiltered.slice().sort((a, b) => a.seq - b.seq);
  return { rows: asc.slice(offset, offset + limit), total: asc.length };
}

export function createPackage(q: ForensicQuery, generatedBy: string): ForensicPackage {
  const all = queryEvents({
    actorId: q.actorId,
    patientId: q.patientId,
    limit: 5000,
    offset: 0,
  }).rows;
  const timeFiltered = applyTimeFilter(all, q.from, q.to).slice().sort((a, b) => a.seq - b.seq);
  const chain = verifyChain();
  const pkg: ForensicPackage = {
    packageId: nextId(),
    generatedBy,
    generatedAt: new Date().toISOString(),
    query: {
      actorId: q.actorId ?? '',
      patientId: q.patientId ?? '',
      from: q.from ?? '',
      to: q.to ?? '',
    },
    eventCount: timeFiltered.length,
    hashChainValid: chain.valid,
    hashChainBrokenAt: chain.brokenAt,
    events: timeFiltered,
  };
  packages.set(pkg.packageId, pkg);  // immutable：只 set 不 update
  return pkg;
}

export function getPackage(packageId: string): ForensicPackage | null {
  return packages.get(packageId) ?? null;
}

export function packageToCsv(pkg: ForensicPackage): string {
  const header = 'seq,occurredAt,actorId,actorRole,action,module,resourceType,resourceId,patientId,result,errorCode,ip,hash';
  const lines = pkg.events.map((e) =>
    [e.seq, e.occurredAt, e.actorId, e.actorRole, e.action, e.module, e.resourceType, e.resourceId ?? '', e.patientId ?? '', e.result, e.errorCode ?? '', e.ip, e.hash].join(',')
  );
  return [header, ...lines].join('\n');
}

export function __resetStore(): void {
  packages.clear();
  counter = 0;
}
