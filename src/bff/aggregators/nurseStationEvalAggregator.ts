/**
 * 健澜科技 jlmedaios - 单患者护理评估汇总聚合器（M30-A + M32-A 手术麻醉块）
 * 只读聚合：复用各 repo 最新值 + buildEvalSummary。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getVisitById } from '../../db/repositories/visitRepo.js';
import { canAccessVisit } from './inpatientCareAggregator.js';
import { listByVisit as listNutrition } from '../../db/repositories/nutritionScreeningRepo.js';
import { listByVisit as listPain } from '../../db/repositories/painAssessmentRepo.js';
import { listByAssignee } from '../../db/repositories/improvementTaskRepo.js';
import { listByVisit as listPreop } from '../../db/repositories/preopAssessmentRepo.js';
import { listByVisit as listPacu } from '../../db/repositories/pacuRecordRepo.js';
import { listByVisit as listFollowup } from '../../db/repositories/postopFollowupRepo.js';
import { buildEvalSummary } from '../../medical-tools/nursing/evalSummary.js';
import { isComplete } from '../../medical-tools/nursing/preopAssessment.js';
import { aldreteTotal, readyForDischarge } from '../../medical-tools/nursing/pacuRecord.js';

export class EvalError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'EvalError';
  }
}
const notFound = (m: string) => new EvalError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new EvalError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getVisitEvaluations(auth: AuthView, visitId: string) {
  assertPermission(auth, 'nurse_eval:view');
  if (!UUID_RE.test(visitId)) throw notFound('visitId 非法');
  const visit = await getVisitById(visitId);
  if (!visit) throw notFound('就诊不存在');
  if (!canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');

  const [nuts, pains, myTasks, preops, pacus, followups] = await Promise.all([
    listNutrition(visitId),
    listPain(visitId),
    listByAssignee(auth.id),
    listPreop(visitId),
    listPacu(visitId),
    listFollowup(visitId),
  ]);
  const latestNut = nuts[0] ?? null;
  const latestPain = pains[0] ?? null;
  const latestPreop = preops[0] ?? null;
  const latestPacu = pacus[0] ?? null;
  const openTasksForVisit = myTasks.filter((t) => t.visitId === visitId && ['open', 'accepted', 'in_progress'].includes(t.status));
  const followupPending = followups.filter((f) => !f.completedAt).length;
  const anesthesiaOpenTasks = openTasksForVisit.filter((t) => t.source === 'anesthesia' || t.source === 'pain').length;

  const pacuAldrete = latestPacu
    ? aldreteTotal(latestPacu.activity, latestPacu.respiration, latestPacu.circulation, latestPacu.consciousness, latestPacu.spo2)
    : null;

  const summary = buildEvalSummary({
    nutrition: latestNut ? { totalScore: latestNut.totalScore, nutritionRisk: latestNut.nutritionRisk } : null,
    pain: latestPain ? { score: latestPain.score, level: latestPain.assessType } : null,
    openTaskCount: openTasksForVisit.length,
    surgery: {
      preopComplete: latestPreop ? isComplete(latestPreop.npoConfirmed, latestPreop.allergyChecked, latestPreop.consentSigned) : true,
      preopMissing: latestPreop
        ? [!latestPreop.npoConfirmed && 'npo', !latestPreop.allergyChecked && 'allergy', !latestPreop.consentSigned && 'consent'].filter(Boolean) as string[]
        : [],
      pacuAldrete,
      pacuReady: pacuAldrete == null ? true : readyForDischarge(pacuAldrete),
      followupPending,
      anesthesiaOpenTasks,
    },
  });

  return {
    visitId,
    patientId: visit.patientId,
    department: visit.department,
    latestNutrition: latestNut,
    latestPain: latestPain,
    latestPreop: latestPreop,
    latestPacu: latestPacu,
    followups,
    openTasks: openTasksForVisit,
    summary,
  };
}
