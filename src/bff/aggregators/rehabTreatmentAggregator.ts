/**
 * 健澜科技 jlmedaios - 康复治疗执行聚合器（M51-A）
 *
 * 治疗师开单 → 签到执行 → 填疗效。疗效 fair/poor 自动建 source='rehab' 复评工单
 * （幂等：同 visit 已有 open/accepted/in_progress 工单则不重复建）。
 * 越权（数据范围外 visit）→ 403；无权限码 → 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import {
  prescribeTreatment, signExecution, completeWithEfficacy, listByVisit,
  lockTreatment, type RehabEfficacy, type RehabModality, type RehabTreatment,
} from '../../db/repositories/rehabTreatmentRepo.js';
import { nextStatus, needsReReview } from '../../medical-tools/nursing/rehabTreatment.js';

export class RehabTreatmentError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'RehabTreatmentError';
  }
}
const notFound = (m: string) => new RehabTreatmentError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new RehabTreatmentError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new RehabTreatmentError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODALITIES: RehabModality[] = ['pt', 'ot', 'st', 'physical', 'cupping', 'traction'];
const EFFICACIES: RehabEfficacy[] = ['excellent', 'good', 'fair', 'poor'];

/** 加载在院住院就诊并校验数据范围。 */
async function loadInpatientVisit(auth: AuthView, visitId: string) {
  const visit = await getVisitById(visitId);
  if (!visit || visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw notFound('在院住院就诊不存在或已结束');
  }
  if (!canAccessVisit(auth, visit)) {
    throw forbidden('超出数据权限范围，无法操作该患者');
  }
  return visit;
}

/** 开单。 */
export async function prescribeView(
  auth: AuthView,
  input: { visitId: string; modality: string; scheduledDate: string; note?: string | null },
): Promise<RehabTreatment> {
  assertPermission(auth, 'rehab_treatment:manage');
  if (!UUID_RE.test(input.visitId.trim())) throw badRequest('就诊标识非法');
  if (!MODALITIES.includes(input.modality as RehabModality)) throw badRequest('康复方式非法');
  await loadInpatientVisit(auth, input.visitId.trim());
  return withTx((tx) => prescribeTreatment({
    visitId: input.visitId.trim(),
    modality: input.modality as RehabModality,
    prescribedBy: auth.id,
    scheduledDate: input.scheduledDate,
    note: input.note ?? null,
  }, tx));
}

/** 签到执行：prescribed → signed。 */
export async function signView(auth: AuthView, id: string): Promise<RehabTreatment> {
  assertPermission(auth, 'rehab_treatment:manage');
  if (!UUID_RE.test(id.trim())) throw badRequest('治疗单标识非法');
  return withTx(async (tx) => {
    const cur = await lockTreatment(id.trim(), tx);
    if (!cur) throw notFound('治疗单不存在');
    await loadInpatientVisit(auth, cur.visitId);
    if (nextStatus(cur.status, 'sign') === null) throw badRequest(`当前状态不可签到：${cur.status}`);
    const updated = await signExecution(id.trim(), auth.id, tx);
    if (!updated) throw badRequest('签到失败（状态已变化）');
    return updated;
  });
}

/** 填疗效完成：signed → completed；fair/poor 建复评工单。 */
export async function completeView(
  auth: AuthView,
  id: string,
  input: { efficacy: string; note?: string | null },
): Promise<{ treatment: RehabTreatment; reviewWorkOrderCreated: boolean }> {
  assertPermission(auth, 'rehab_treatment:manage');
  if (!UUID_RE.test(id.trim())) throw badRequest('治疗单标识非法');
  if (!EFFICACIES.includes(input.efficacy as RehabEfficacy)) throw badRequest('疗效评定非法');
  const efficacy = input.efficacy as RehabEfficacy;
  return withTx(async (tx) => {
    const cur = await lockTreatment(id.trim(), tx);
    if (!cur) throw notFound('治疗单不存在');
    await loadInpatientVisit(auth, cur.visitId);
    if (nextStatus(cur.status, 'complete') === null) throw badRequest(`当前状态不可完成：${cur.status}`);
    const treatment = await completeWithEfficacy(id.trim(), efficacy, input.note ?? null, tx);
    if (!treatment) throw badRequest('完成失败（状态已变化）');

    let reviewWorkOrderCreated = false;
    if (needsReReview(efficacy) && !(await hasOpenTask(cur.visitId, 'rehab', tx))) {
      await createTask({
        source: 'rehab',
        visitId: cur.visitId,
        title: `康复复评：${cur.modality}`,
        finding: `疗效=${efficacy}，需复评调整方案`,
        assigneeId: auth.id,
        createdBy: auth.id,
      }, tx);
      reviewWorkOrderCreated = true;
    }
    return { treatment, reviewWorkOrderCreated };
  });
}

/** 列表。 */
export async function listView(auth: AuthView, visitId: string): Promise<RehabTreatment[]> {
  assertPermission(auth, 'rehab_treatment:view');
  if (!UUID_RE.test(visitId.trim())) throw badRequest('就诊标识非法');
  await loadInpatientVisit(auth, visitId.trim());
  return listByVisit(visitId.trim());
}
