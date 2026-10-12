/**
 * 健澜科技 jlmedaios - 护理出入量聚合器（M17-E）
 *
 * 复用 inpatientCareAggregator.canAccessVisit（越权403）；amount_ml 合法校验；
 * recorded_by 本人；提供 24h 平衡与三班汇总（纯函数）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { insertIoRecord, listIoRecords, type IoCategory, type IoRecord } from '../../db/repositories/nursingIoRepo.js';
import { summarize24h, summarizeByShift, summarizeIo, type IoRow } from '../../medical-tools/nursing/ioBalance.js';

export class NursingIoError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'NursingIoError';
  }
}
const badRequest = (m: string) => new NursingIoError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new NursingIoError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new NursingIoError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

async function loadVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法操作该患者');
  return visit;
}

const CATEGORIES: ReadonlySet<string> = new Set([
  'oral', 'tube_feed', 'iv', 'blood_product', 'urine', 'stool', 'drain', 'vomit', 'sweat', 'other',
]);

export async function recordIoView(
  auth: AuthView,
  input: { visitId: string; direction: 'intake' | 'output'; category: IoCategory; amountMl: number; recordTime?: string; note?: string },
): Promise<IoRecord> {
  assertPermission(auth, 'nursing_io:write');
  assertUuid(input.visitId, '就诊');
  if (input.direction !== 'intake' && input.direction !== 'output') throw badRequest('direction 须为 intake/output');
  if (!CATEGORIES.has(input.category)) throw badRequest('非法 category');
  if (!Number.isFinite(input.amountMl) || input.amountMl < 0 || input.amountMl > 10000) {
    throw badRequest('amount_ml 须在 0~10000 之间');
  }
  const visit = await loadVisit(auth, input.visitId);
  return withTx(async (tx) => {
    const rec = await insertIoRecord(
      {
        visitId: visit.id,
        patientId: visit.patientId,
        direction: input.direction,
        category: input.category,
        amountMl: input.amountMl,
        recordTime: input.recordTime,
        note: input.note ?? null,
        recordedBy: auth.id,
      },
      tx,
    );
    await recordChainAudit(
      { actorId: auth.id, action: 'nursing_io.record', resourceType: 'visit', resourceId: visit.id, result: 'success', riskLevel: 'low', detail: { ioId: rec.id, direction: input.direction, amountMl: input.amountMl } },
      tx,
    );
    return rec;
  });
}

function toRows(recs: IoRecord[]): IoRow[] {
  return recs.map((r) => ({ direction: r.direction, amountMl: r.amountMl, recordTime: r.recordTime }));
}

export async function listIoView(auth: AuthView, visitId: string) {
  assertPermission(auth, 'nursing_io:read');
  assertUuid(visitId, '就诊');
  await loadVisit(auth, visitId);
  const recs = await listIoRecords({ visitId });
  return recs;
}

export async function getIoBalanceView(auth: AuthView, visitId: string) {
  assertPermission(auth, 'nursing_io:read');
  assertUuid(visitId, '就诊');
  await loadVisit(auth, visitId);
  const recs = await listIoRecords({ visitId });
  const rows = toRows(recs);
  return {
    all: summarizeIo(rows),
    last24h: summarize24h(rows),
    byShift: summarizeByShift(rows),
  };
}
