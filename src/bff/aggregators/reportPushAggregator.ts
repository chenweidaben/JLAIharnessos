/**
 * 健澜科技 jlmedaios - 报告推送聚合器（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getById, listByPatient, markViewed, pushReport } from '../../db/repositories/reportPushRepo.js';
import { canPushReport, nextViewState, unreadCount } from '../../medical-tools/internet/reportPush.js';

export class ReportPushError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ReportPushError';
  }
}
const badRequest = (m: string) => new ReportPushError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ReportPushError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ReportPushError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

/** 医护端推送（幂等）。 */
export async function pushView(
  auth: AuthView,
  input: { reportType: 'lab' | 'imaging'; reportId: string; patientId: string; visitId?: string | null; reviewed?: boolean; hasConclusion?: boolean },
) {
  assertPermission(auth, 'report_push:manage');
  assertUuid(input.reportId, '报告');
  assertUuid(input.patientId, '患者');
  if (!canPushReport({ reviewed: input.reviewed ?? true, hasConclusion: input.hasConclusion ?? true })) {
    throw badRequest('报告未审核或无结论，不可推送');
  }
  return withTx(async (tx) => {
    const r = await pushReport({
      reportType: input.reportType, reportId: input.reportId, patientId: input.patientId,
      visitId: input.visitId ?? null, pushedBy: auth.id,
    }, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'report.push', resourceType: input.reportType, resourceId: input.reportId, result: 'success', riskLevel: 'low', detail: {} },
      tx,
    );
    return r;
  });
}

/** 患者端"我的报告"列表。 */
export async function listMineView(auth: AuthView, patientId: string) {
  assertPermission(auth, 'report:view_patient');
  assertUuid(patientId, '患者');
  const items = await listByPatient(patientId);
  return { items, unread: unreadCount(items) };
}

/** 查看回执。 */
export async function viewView(auth: AuthView, pushId: string) {
  assertPermission(auth, 'report:view_patient');
  assertUuid(pushId, '推送记录');
  const existing = await getById(pushId);
  if (!existing) throw notFound('推送记录不存在');
  return withTx(async (tx) => {
    const updated = await markViewed(pushId, tx);
    await recordChainAudit(
      { actorId: auth.id, action: 'report.view', resourceType: 'report_push', resourceId: pushId, result: 'success', riskLevel: 'low', detail: { from: existing.status, to: nextViewState(existing).status } },
      tx,
    );
    return updated;
  });
}
