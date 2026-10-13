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
import { listByVisit as listIcu } from '../../db/repositories/icuSedationRepo.js';
import { listByMother } from '../../db/repositories/postpartumVisitRepo.js';
import { getByVisit as getTriage } from '../../db/repositories/erTriageRepo.js';
import { listByVisit as listBarthel } from '../../db/repositories/barthelRepo.js';
import { listByVisit as listPsych } from '../../db/repositories/psychScreeningRepo.js';
import { listByVisit as listVteAnticoag } from '../../db/repositories/vteAnticoagRepo.js';
import { listByVisit as listRehabTreatments } from '../../db/repositories/rehabTreatmentRepo.js';
import { listByPatient as listPainClinic } from '../../db/repositories/painClinicRepo.js';
import { getLatestByVisit as getLatestCga } from '../../db/repositories/cgaRepo.js';
import { listByVisit as listNutritionConsult } from '../../db/repositories/nutritionConsultRepo.js';
import { getLatestByVisit as getLatestStopbang } from '../../db/repositories/stopbangRepo.js';
import { getLatest as getLatestPicc } from '../../db/repositories/piccRepo.js';
import { getLatestByVisit as getLatestSurgical } from '../../db/repositories/surgicalChecklistRepo.js';
import { getDb } from '../../db/pool.js';
import { buildEvalSummary } from '../../medical-tools/nursing/evalSummary.js';
import { planTier } from '../../medical-tools/nursing/nutritionConsult.js';
import { isComplete } from '../../medical-tools/nursing/preopAssessment.js';
import { aldreteTotal, readyForDischarge } from '../../medical-tools/nursing/pacuRecord.js';
import { jaundiceElevated, breastfeedingAdequacy } from '../../medical-tools/nursing/postpartumVisit.js';

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

  const [nuts, pains, myTasks, preops, pacus, followups, icuList, ppList, triage, barthelList, psychList, vteList, rehabTxList, painClinicList, latestCga, nutritionConsultList, latestStopbang, latestPicc, latestSurgical] = await Promise.all([
    listNutrition(visitId),
    listPain(visitId),
    listByAssignee(auth.id),
    listPreop(visitId),
    listPacu(visitId),
    listFollowup(visitId),
    listIcu(visitId),
    listByMother(visitId),
    getTriage(visitId),
    listBarthel(visitId),
    listPsych(visitId),
    listVteAnticoag(visitId),
    listRehabTreatments(visitId),
    listPainClinic(visit.patientId),
    getLatestCga(visitId),
    listNutritionConsult(visitId),
    getLatestStopbang(visitId),
    getLatestPicc(visit.patientId),
    getLatestSurgical(visitId),
  ]);
  const latestVte = vteList[0] ?? null;
  const latestRehabTx = rehabTxList[0] ?? null;
  const latestPainClinic = painClinicList[0] ?? null;
  const latestNutritionConsult = nutritionConsultList[0] ?? null;
  const db = getDb();
  const nissRows = await db`SELECT id, infection_type, status FROM clinical.nosocomial_infections WHERE visit_id=${visitId} AND status IN ('reported','under_investigation') ORDER BY created_at DESC`;
  const nissActiveCount = nissRows.length;
  const nissLatest = nissRows[0] ?? null;
  const latestPsych = psychList[0] ?? null;
  const latestIcu = icuList[0] ?? null;
  const latestPp = ppList[0] ?? null;
  const latestBarthel = barthelList[0] ?? null;
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
    icu: latestIcu ? {
      rass: latestIcu.rassScore, targetRass: latestIcu.targetRass,
      overSedated: latestIcu.rassScore <= -3,
    } : undefined,
    postpartum: latestPp ? {
      day: latestPp.postpartumDay,
      jaundiceElevated: jaundiceElevated(latestPp.postpartumDay, latestPp.jaundiceTcb),
      breastfeedingAdequate: breastfeedingAdequacy(latestPp.breastfeedingScore),
    } : undefined,
    er: triage ? {
      level: triage.level, greenChannel: triage.greenChannel,
    } : undefined,
    rehab: latestBarthel ? {
      totalScore: latestBarthel.totalScore,
      dependencyLevel: latestBarthel.dependencyLevel,
    } : undefined,
    rehabTreatment: latestRehabTx ? {
      modality: latestRehabTx.modality,
      status: latestRehabTx.status,
      efficacy: latestRehabTx.efficacy,
    } : undefined,
    painClinic: latestPainClinic ? {
      baselineNrs: latestPainClinic.baselineNrs,
      currentNrs: latestPainClinic.currentNrs,
      breakthroughCount: latestPainClinic.breakthroughCount,
      adjustmentSuggestion: latestPainClinic.adjustmentSuggestion,
    } : undefined,
    cga: latestCga ? {
      adlScore: latestCga.adlScore,
      iadlScore: latestCga.iadlScore,
      mmseScore: latestCga.mmseScore,
      fallRisk: latestCga.fallRisk,
      mnaScore: latestCga.mnaScore,
      gdsScore: latestCga.gdsScore,
      riskLevel: latestCga.riskLevel,
    } : undefined,
    nutritionConsult: latestNutritionConsult ? {
      nutritionDiagnosis: latestNutritionConsult.nutritionDiagnosis,
      planTier: planTier(latestNutritionConsult.caloriesPerDay),
      caloriesPerDay: latestNutritionConsult.caloriesPerDay,
      followupDays: latestNutritionConsult.followupDays,
      status: latestNutritionConsult.status,
    } : undefined,
    stopbang: latestStopbang ? {
      score: latestStopbang.score,
      riskLevel: latestStopbang.riskLevel,
    } : undefined,
    psych: latestPsych ? {
      phq9Total: latestPsych.phq9Total, phq9Level: latestPsych.phq9Level,
      gad7Total: latestPsych.gad7Total, gad7Level: latestPsych.gad7Level,
    } : undefined,
    vte: latestVte ? {
      drug: latestVte.drug, active: latestVte.active, bleedingScore: latestVte.bleedingScore,
    } : undefined,
    infection: {
      activeCount: nissActiveCount,
      latestType: nissLatest ? String(nissLatest.infection_type) : null,
      latestStatus: nissLatest ? String(nissLatest.status) : null,
    },
    picc: latestPicc ? {
      deviceType: latestPicc.deviceType,
      insertedAt: latestPicc.insertedAt,
      lastMaintainedAt: latestPicc.lastMaintainedAt,
      complication: latestPicc.complication,
    } : undefined,
    surgical: latestSurgical ? {
      signinComplete: latestSurgical.signinComplete,
      timeoutComplete: latestSurgical.timeoutComplete,
      signoutComplete: latestSurgical.signoutComplete,
      status: latestSurgical.status,
    } : undefined,
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
    latestRehabTreatment: latestRehabTx,
    latestPainClinic,
    latestCga,
    latestNutritionConsult,
    latestStopbang,
    latestPicc,
    latestSurgicalChecklist: latestSurgical,
    summary,
  };
}
