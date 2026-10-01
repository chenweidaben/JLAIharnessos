/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊聚合器（M3-P）
 *
 * 智能导诊：症状 → 规则引擎推荐科室（确定性），患者确认后完成；
 * 预问诊：结构化采集病史 → 生成报告供医生参考，医生可采用。
 *
 * 安全边界：
 *  - 导诊/预问诊结果为「建议」，不构成诊断；
 *  - 最终诊断、病历由医师本人确认签名；
 *  - 审计哈希链留痕。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx, getDb } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  createTriageSession,
  getTriageSessionById,
  appendDialogAndChoose,
  listTriageSessions,
  createPreliminaryConsultation,
  getPreliminaryConsultationById,
  listPreliminaryConsultations,
  markPreliminaryConsumed,
  type TriageSessionRow,
  type PreliminaryConsultationRow,
} from '../../db/repositories/smartTriageRepo.js';
import {
  recommendDepartments,
  type DepartmentRecommendation,
} from '../../knowledge/rules/departmentTriageRules.js';
import {
  buildPreliminaryReport,
  validatePreliminaryHistory,
  type PreliminaryHistoryInput,
} from '../../knowledge/rules/preliminaryReportBuilder.js';
import type { AuthView } from '../view/userView.js';

export class SmartTriageError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SmartTriageError';
  }
}
const badRequest = (m: string) => new SmartTriageError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SmartTriageError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SmartTriageError(403, 'FORBIDDEN', m);

/** 开始智能导诊：症状 → 推荐科室。 */
export async function startTriage(
  auth: AuthView,
  input: { symptoms: string; patientId?: string | null },
): Promise<{ session: TriageSessionRow; recommendations: DepartmentRecommendation[] }> {
  const symptoms = (input.symptoms ?? '').trim();
  if (!symptoms) throw badRequest('请描述您的症状');
  if (symptoms.length < 2) throw badRequest('症状描述过短，请补充具体不适');

  const recommendations = recommendDepartments(symptoms, 3);

  const session = await createTriageSession({
    accountId: auth.id,
    patientId: input.patientId ?? null,
    symptoms,
    recommendations,
    engineType: 'rule',
  });

  await recordChainAudit({
    actorId: auth.id,
    action: 'triage.start',
    resourceType: 'triage_session',
    resourceId: session.id,
    result: 'success',
    detail: { top: recommendations[0]?.department },
  });

  return { session, recommendations };
}

/** 患者确认推荐科室，完成导诊。 */
export async function chooseDepartment(
  auth: AuthView,
  input: { sessionId: string; department: string },
): Promise<TriageSessionRow> {
  const department = (input.department ?? '').trim();
  if (!department) throw badRequest('请选择科室');

  const session = await getTriageSessionById(input.sessionId);
  if (!session) throw notFound('导诊会话不存在');
  if (session.accountId !== auth.id) throw forbidden('只能处理本人的导诊会话');
  if (session.status === 'completed') return session;

  const updated = await appendDialogAndChoose(session.id, {
    chosenDepartment: department,
    complete: true,
  });
  if (!updated) throw notFound('导诊会话更新失败');

  await recordChainAudit({
    actorId: auth.id,
    action: 'triage.choose',
    resourceType: 'triage_session',
    resourceId: session.id,
    result: 'success',
    detail: { department },
  });

  return updated;
}

/** 提交预问诊病史 → 生成报告。 */
export async function submitPreliminary(
  auth: AuthView,
  input: {
    triageSessionId?: string | null;
    patientId?: string | null;
    targetDepartment?: string | null;
    history: PreliminaryHistoryInput;
  },
): Promise<{ consultation: PreliminaryConsultationRow; reportText: string }> {
  const missing = validatePreliminaryHistory(input.history);
  if (missing.length) throw badRequest(`请完善：${missing.join('、')}`);

  let triageSession: TriageSessionRow | null = null;
  if (input.triageSessionId) {
    triageSession = await getTriageSessionById(input.triageSessionId);
    if (!triageSession) throw notFound('导诊会话不存在');
    if (triageSession.accountId !== auth.id) throw forbidden('只能使用本人的导诊会话');
  }

  const targetDepartment =
    input.targetDepartment?.trim() || triageSession?.chosenDepartment || null;

  const reportText = buildPreliminaryReport(targetDepartment ?? undefined, input.history);

  const consultation = await createPreliminaryConsultation({
    triageSessionId: input.triageSessionId ?? null,
    accountId: auth.id,
    patientId: input.patientId ?? triageSession?.patientId ?? null,
    targetDepartment,
    reportText,
    engineType: 'form',
    fields: {
      chiefComplaint: input.history.chiefComplaint,
      presentIllness: input.history.presentIllness,
      pastHistory: input.history.pastHistory ?? null,
      medications: input.history.medications ?? null,
      allergies: input.history.allergies ?? null,
      structured: {
        onsetTime: input.history.onsetTime ?? null,
        accompanyingSymptoms: input.history.accompanyingSymptoms ?? [],
      },
    },
  });

  await recordChainAudit({
    actorId: auth.id,
    action: 'triage.preliminary',
    resourceType: 'preliminary_consultation',
    resourceId: consultation.id,
    result: 'success',
    detail: { department: targetDepartment },
  });

  return { consultation, reportText };
}

/** 患者：查看我的导诊会话。 */
export function listMyTriage(auth: AuthView): Promise<TriageSessionRow[]> {
  return listTriageSessions({ accountId: auth.id });
}

/** 医护：查看预问诊报告（可按患者过滤）。 */
export function listPreliminaryForStaff(
  _auth: AuthView,
  filter: { patientId?: string } = {},
): Promise<PreliminaryConsultationRow[]> {
  return listPreliminaryConsultations({
    patientId: filter.patientId,
    status: 'completed',
  });
}

/** 医护：查看预问诊报告详情。 */
export async function getPreliminaryDetail(
  _auth: AuthView,
  id: string,
): Promise<PreliminaryConsultationRow> {
  const row = await getPreliminaryConsultationById(id);
  if (!row) throw notFound('预问诊报告不存在');
  return row;
}

/** 医生采用预问诊报告（标记 consumed）。 */
export async function consumePreliminary(
  auth: AuthView,
  id: string,
): Promise<PreliminaryConsultationRow> {
  const existing = await getPreliminaryConsultationById(id);
  if (!existing) throw notFound('预问诊报告不存在');
  if (existing.status === 'consumed') return existing;

  const updated = await withTx(async (tx) => {
    const row = await markPreliminaryConsumed(id, tx);
    if (row) {
      await recordChainAudit({
        actorId: auth.id,
        action: 'triage.consume',
        resourceType: 'preliminary_consultation',
        resourceId: id,
        result: 'success',
      }, tx);
    }
    return row;
  });

  if (!updated) throw notFound('采用失败');
  return updated;
}
