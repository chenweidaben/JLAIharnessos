/**
 * 健澜科技 jlmedaios - 危急值闭环聚合器（M3-F / M7-C 事务性发件箱）
 *
 * 扫描 is_critical 检验结果产生告警（幂等），驱动 raised -> acked -> resolved 闭环。
 * 签收与处置均由医师本人签名留痕。
 *
 * M7-C：领域事件不再直接走内存推送，而是在业务事务内写入 event_outbox（与业务
 * 变更原子提交），由 OutboxRelay 轮询发布到 WebSocket，保证「业务落库即必发」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import {
  scanAndRaise,
  getById,
  listAlerts,
  setStatus,
  getPatientNameMap,
  type CriticalAlert,
  type CriticalListRow,
  type CriticalStatus,
} from '../../db/repositories/criticalValueRepo.js';
import { appendEvent } from '../../db/repositories/outboxRepo.js';
import { buildCriticalAlertPayload } from '../alertBus.js';

export class CriticalError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CriticalError';
  }
}
const badRequest = (m: string) => new CriticalError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new CriticalError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new CriticalError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new CriticalError(409, 'CONFLICT', m);

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

/** 构造签收/处置状态事件 payload（与前端 critical:status 契约对齐）。 */
function buildStatusPayload(
  id: string,
  status: 'acked' | 'resolved',
  actedBy: string,
  note: string | null,
): Record<string, unknown> {
  return {
    id,
    status,
    actedBy,
    note,
    at: new Date().toISOString(),
  };
}

/**
 * 扫描并上报新危急值（幂等）。对每条新告警在同事务内写入 outbox（critical:alert），
 * 由 Relay 实时推送（payload 含稳定 id，前端按 id 去重），返回新产生条数。
 */
export async function scanCritical(): Promise<{ raised: number }> {
  return withTx(async (tx) => {
    const raised = await scanAndRaise(tx);
    if (raised.length === 0) return { raised: 0 };
    const nameMap = await getPatientNameMap(raised.map((a) => a.patientId), tx);
    for (const a of raised) {
      const payload = buildCriticalAlertPayload({
        id: a.id,
        visitId: a.visitId,
        patientId: a.patientId,
        patientName: nameMap[a.patientId],
        department: a.department,
        itemName: a.itemName,
        value: a.value,
        unit: a.unit,
        refLow: a.refLow,
        refHigh: a.refHigh,
        status: a.status,
        raisedAt: a.raisedAt,
      });
      await appendEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: 'critical:alert',
          aggregateType: 'critical_value',
          aggregateId: a.id,
          payload,
        },
        tx,
      );
    }
    return { raised: raised.length };
  });
}

/** 告警队列（按 DataScope 过滤）。 */
export async function listQueue(auth: AuthView, status: CriticalStatus | null): Promise<CriticalListRow[]> {
  const all = await listAlerts(status);
  return all.filter((r) => canAccess(auth, r.department));
}

/** 医师签收（raised -> acked），同事务写 outbox（critical:status=acked）。 */
export async function ackAlert(id: string, auth: AuthView): Promise<CriticalAlert> {
  const existing = await getById(id);
  if (!existing) throw notFound('危急值告警不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权处理该科室危急值');
  if (existing.status !== 'raised') throw conflict('仅待签收(raised)的告警可签收');

  const updated = await withTx(async (tx) => {
    const u = await setStatus(id, ['raised'], 'acked', { ackedBy: auth.id }, tx);
    if (u) {
      await appendEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: 'critical:status',
          aggregateType: 'critical_value',
          aggregateId: u.id,
          payload: buildStatusPayload(u.id, 'acked', auth.id, null),
        },
        tx,
      );
    }
    return u;
  });
  if (!updated) throw conflict('告警状态已变更，请刷新');
  return updated;
}

/** 医师处置闭环（acked -> resolved），同事务写 outbox（critical:status=resolved）。 */
export async function resolveAlert(
  id: string,
  auth: AuthView,
  note: string,
): Promise<CriticalAlert> {
  const existing = await getById(id);
  if (!existing) throw notFound('危急值告警不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权处理该科室危急值');
  if (existing.status !== 'acked') throw conflict('仅已签收(acked)的告警可处置闭环');
  if (!note || !note.trim()) throw badRequest('处置记录不能为空');

  const updated = await withTx(async (tx) => {
    const u = await setStatus(
      id,
      ['acked'],
      'resolved',
      { resolvedBy: auth.id, dispositionNote: note.trim() },
      tx,
    );
    if (u) {
      await appendEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: 'critical:status',
          aggregateType: 'critical_value',
          aggregateId: u.id,
          payload: buildStatusPayload(u.id, 'resolved', auth.id, note.trim()),
        },
        tx,
      );
    }
    return u;
  });
  if (!updated) throw conflict('告警状态已变更，请刷新');
  return updated;
}
