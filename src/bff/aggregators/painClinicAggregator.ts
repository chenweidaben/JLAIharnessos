/**
 * 健澜科技 jlmedaios - 疼痛门诊聚合器（M52-A）
 *
 * 门诊登记癌痛 NRS 滴定/爆发痛，纯函数判定滴定响应与方案建议；
 * current_nrs>=7 或爆发痛>=3 自动建 source='pain' 镇痛调整工单（幂等）。
 * 越权（数据范围外患者）→ 403；无权限码 → 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { getVisitsByPatient, type Visit } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import {
  createRecord, listByPatient, type PainClinicRecord,
} from '../../db/repositories/painClinicRepo.js';
import {
  needsEscalation, suggestRegimen, titrationResponse, type RegimenSuggestion,
} from '../../medical-tools/nursing/painClinic.js';

export class PainClinicError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'PainClinicError';
  }
}
const notFound = (m: string) => new PainClinicError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new PainClinicError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new PainClinicError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUGGESTION_TEXT: Record<RegimenSuggestion, string> = {
  escalate_dose: '建议阿片类药物加量（按滴定规范上调剂量）',
  switch_drug: '建议评估更换镇痛药物方案',
  breakthrough_rescue: '建议加用爆发痛解救（短效）药物',
  continue: '维持当前镇痛方案，继续滴定观察',
};

/** 校验数据范围：all 直接放行；其余须患者有就诊且在数据范围内。 */
async function assertPatientScope(auth: AuthView, patientId: string): Promise<Visit | null> {
  const visits = await getVisitsByPatient(patientId);
  if (auth.dataScope === 'all') return visits[0] ?? null;
  const visit = visits[0] ?? null;
  if (!visit) throw forbidden('超出数据权限范围，无法查看该患者');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围，无法查看该患者');
  return visit;
}

export interface RecordResult {
  record: PainClinicRecord;
  titrationResponse: ReturnType<typeof titrationResponse>;
  escalationWorkOrderCreated: boolean;
}

/** 门诊登记。 */
export async function recordView(
  auth: AuthView,
  input: {
    patientId: string; visitId?: string | null; baselineNrs: number; currentNrs: number;
    breakthroughCount?: number; analgesic: string; doseNote?: string | null; titrationRound?: number;
  },
): Promise<RecordResult> {
  assertPermission(auth, 'pain_clinic:manage');
  if (!UUID_RE.test(input.patientId.trim())) throw badRequest('患者标识非法');
  const baseline = Math.round(input.baselineNrs);
  const current = Math.round(input.currentNrs);
  if (baseline < 0 || baseline > 10 || current < 0 || current > 10) throw badRequest('NRS 须在 0~10');
  if (!input.analgesic?.trim()) throw badRequest('镇痛药物必填');
  const breakthrough = Number.isFinite(input.breakthroughCount) ? Math.max(0, Math.round(input.breakthroughCount!)) : 0;

  await assertPatientScope(auth, input.patientId.trim());

  const response = titrationResponse(baseline, current);
  const suggestion = suggestRegimen(current, breakthrough, baseline);
  const suggestionText = SUGGESTION_TEXT[suggestion];
  const escalate = needsEscalation(current, breakthrough);

  return withTx(async (tx) => {
    const record = await createRecord({
      patientId: input.patientId.trim(),
      visitId: input.visitId ?? null,
      baselineNrs: baseline,
      currentNrs: current,
      breakthroughCount: breakthrough,
      analgesic: input.analgesic.trim(),
      doseNote: input.doseNote ?? null,
      titrationRound: input.titrationRound ?? 1,
      adjustmentSuggestion: suggestionText,
      recordedBy: auth.id,
    }, tx);

    let escalationWorkOrderCreated = false;
    if (escalate && !(await hasOpenTask(input.patientId.trim(), 'pain', tx))) {
      await createTask({
        source: 'pain',
        visitId: record.visitId ?? null,
        title: '镇痛方案调整',
        finding: `当前NRS=${current} 爆发痛=${breakthrough} 需升级镇痛`,
        assigneeId: auth.id,
        createdBy: auth.id,
      }, tx);
      escalationWorkOrderCreated = true;
    }
    return { record, titrationResponse: response, escalationWorkOrderCreated };
  });
}

/** 列表。 */
export async function listView(auth: AuthView, patientId: string): Promise<PainClinicRecord[]> {
  assertPermission(auth, 'pain_clinic:view');
  if (!UUID_RE.test(patientId.trim())) throw badRequest('患者标识非法');
  await assertPatientScope(auth, patientId.trim());
  return listByPatient(patientId.trim());
}

export { notFound as painClinicNotFound };
