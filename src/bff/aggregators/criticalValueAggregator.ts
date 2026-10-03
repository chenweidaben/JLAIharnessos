/**
 * 健澜科技 jlmedaios - 危急值闭环聚合器（M3-F）
 *
 * 扫描 is_critical 检验结果产生告警（幂等），驱动 raised -> acked -> resolved 闭环。
 * 签收与处置均由医师本人签名留痕。
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
import { emitCriticalValueAlert, emitCriticalStatus } from '../alertBus.js';

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

/**
 * 扫描并上报新危急值（幂等）。对每条新产生的告警通过 WebSocket 实时推送
 * （payload 含稳定 id，前端按 id 去重），返回新产生条数。
 */
export async function scanCritical(): Promise<{ raised: number }> {
  const raised = await scanAndRaise();
  if (raised.length > 0) {
    const nameMap = await getPatientNameMap(raised.map((a) => a.patientId));
    for (const a of raised) {
      emitCriticalValueAlert({
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
    }
  }
  return { raised: raised.length };
}

/** 告警队列（按 DataScope 过滤）。 */
export async function listQueue(auth: AuthView, status: CriticalStatus | null): Promise<CriticalListRow[]> {
  const all = await listAlerts(status);
  return all.filter((r) => canAccess(auth, r.department));
}

/** 医师签收（raised -> acked），签收后广播状态变更。 */
export async function ackAlert(id: string, auth: AuthView): Promise<CriticalAlert> {
  const existing = await getById(id);
  if (!existing) throw notFound('危急值告警不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权处理该科室危急值');
  if (existing.status !== 'raised') throw conflict('仅待签收(raised)的告警可签收');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['raised'], 'acked', { ackedBy: auth.id }, tx),
  );
  if (!updated) throw conflict('告警状态已变更，请刷新');
  emitCriticalStatus(updated.id, 'acked', { actedBy: auth.id });
  return updated;
}

/** 医师处置闭环（acked -> resolved），处置后广播状态变更。 */
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
  const updated = await withTx(async (tx) =>
    setStatus(id, ['acked'], 'resolved', { resolvedBy: auth.id, dispositionNote: note.trim() }, tx),
  );
  if (!updated) throw conflict('告警状态已变更，请刷新');
  emitCriticalStatus(updated.id, 'resolved', { actedBy: auth.id, note: note.trim() });
  return updated;
}
