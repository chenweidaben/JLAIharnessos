/**
 * 健澜科技 jlmedaios - 满意度评价聚合器（M3-O）
 *
 * 患者对就诊/问诊进行多维度满意度评价；医护查看统计。
 * 一次就诊/问诊仅可评价一次（部分唯一索引 + 冲突回查）。
 *
 * 安全约束：
 *  - 评分 1-5；visit/consult 至少关联一个；
 *  - 患者本人归属强校验（consultation_sessions.account_id 或 patient_profiles.account_id）；
 *  - 医护可代提交（权限码 + DataScope），审计哈希链留痕；
 *  - 评价提交后不可改。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx, getDb } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  insertSurvey,
  findSurveyForTarget,
  getSurveyById,
  listSurveys,
  getSurveyStats,
  type SatisfactionSurvey,
  type SatisfactionSource,
  type SatisfactionStats,
} from '../../db/repositories/satisfactionRepo.js';
import type { AuthView } from '../view/userView.js';

export class SatisfactionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SatisfactionError';
  }
}
const badRequest = (m: string) => new SatisfactionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SatisfactionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SatisfactionError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new SatisfactionError(409, 'CONFLICT', m);

const genSurveyNo = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `SV${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(100000 + Math.random() * 900000)}`;
};

export interface SurveyScoresInput {
  patientId: string;
  visitId?: string | null;
  consultId?: string | null;
  sourceType?: SatisfactionSource;
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment?: string | null;
}

const SCORE_FIELDS = [
  'overallScore', 'medicalScore', 'serviceScore',
  'environmentScore', 'processScore', 'waitScore',
] as const;

function assertScoreRange(input: SurveyScoresInput) {
  for (const f of SCORE_FIELDS) {
    const v = input[f];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
      throw badRequest(`${f} 必须为 1-5 的整数`);
    }
  }
}

/** 校验目标就诊/问诊存在，并返回推断的 sourceType。 */
async function resolveTarget(
  input: SurveyScoresInput,
): Promise<{ sourceType: SatisfactionSource; patientId: string }> {
  const hasVisit = Boolean(input.visitId);
  const hasConsult = Boolean(input.consultId);
  if (!hasVisit && !hasConsult) throw badRequest('必须关联就诊（visitId）或问诊（consultId）');

  if (hasConsult) {
    const rows = await getDb()`
      SELECT id, patient_id, account_id FROM clinical.consultation_sessions
       WHERE id = ${input.consultId}
    `;
    const session = rows[0] as Record<string, unknown> | undefined;
    if (!session) throw notFound('问诊会话不存在');
    if (String(session.patient_id) !== input.patientId) {
      throw badRequest('患者与问诊会话不匹配');
    }
    return { sourceType: 'consultation', patientId: String(session.patient_id) };
  }

  const rows = await getDb()`
    SELECT id, patient_id FROM clinical.visits WHERE id = ${input.visitId}
  `;
  const visit = rows[0] as Record<string, unknown> | undefined;
  if (!visit) throw notFound('就诊记录不存在');
  if (String(visit.patient_id) !== input.patientId) {
    throw badRequest('患者与就诊记录不匹配');
  }
  // 推断门诊/住院来源（显式传入优先）
  const sourceType: SatisfactionSource = input.sourceType ?? 'outpatient';
  return { sourceType, patientId: String(visit.patient_id) };
}

/**
 * 患者本人提交满意度评价。
 * 归属：问诊走 consultation_sessions.account_id；就诊走 patient_profiles.account_id。
 */
export async function submitMySurvey(
  auth: AuthView,
  input: SurveyScoresInput,
): Promise<{ survey: SatisfactionSurvey; created: boolean }> {
  assertScoreRange(input);
  const target = await resolveTarget(input);

  // 患者本人归属校验
  if (input.consultId) {
    const rows = await getDb()`
      SELECT account_id FROM clinical.consultation_sessions WHERE id = ${input.consultId}
    `;
    const session = rows[0] as Record<string, unknown> | undefined;
    if (!session || String(session.account_id) !== auth.id) {
      throw forbidden('仅本人可评价自己的问诊');
    }
  } else {
    const rows = await getDb()`
      SELECT 1 FROM clinical.patient_profiles
       WHERE account_id = ${auth.id} AND patient_id = ${target.patientId} LIMIT 1
    `;
    if (rows.length === 0) {
      throw forbidden('仅本人可评价自己的就诊');
    }
  }

  return withTx(async (tx) => {
    // 唯一冲突回查（同就诊/问诊已评价）
    const existing = await findSurveyForTarget(
      { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
      tx,
    );
    if (existing) {
      return { survey: existing, created: false };
    }

    const survey = await insertSurvey(
      {
        surveyNo: genSurveyNo(),
        patientId: target.patientId,
        visitId: input.visitId ?? null,
        consultId: input.consultId ?? null,
        sourceType: target.sourceType,
        overallScore: input.overallScore,
        medicalScore: input.medicalScore,
        serviceScore: input.serviceScore,
        environmentScore: input.environmentScore,
        processScore: input.processScore,
        waitScore: input.waitScore,
        comment: input.comment ?? null,
        submittedBy: auth.id,
      },
      tx,
    );
    if (!survey) {
      // 并发下唯一索引兜底，回查既有
      const existing2 = await findSurveyForTarget(
        { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
        tx,
      );
      if (existing2) return { survey: existing2, created: false };
      throw conflict('满意度评价提交失败，请重试');
    }

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'satisfaction.submit',
        resourceType: 'satisfaction_survey',
        resourceId: survey.id,
        patientRef: target.patientId,
        result: 'success',
        riskLevel: 'low',
        detail: { surveyNo: survey.surveyNo, overall: survey.overallScore },
      },
      tx,
    );
    return { survey, created: true };
  });
}

/**
 * 医护代患者提交满意度评价（权限码 satisfaction:submit）。
 * 不做 account 归属校验（医护在职责范围内代录入），审计留痕。
 */
export async function submitSurveyByStaff(
  auth: AuthView,
  input: SurveyScoresInput,
): Promise<{ survey: SatisfactionSurvey; created: boolean }> {
  assertScoreRange(input);
  const target = await resolveTarget(input);
  return withTx(async (tx) => {
    const existing = await findSurveyForTarget(
      { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
      tx,
    );
    if (existing) return { survey: existing, created: false };

    const survey = await insertSurvey(
      {
        surveyNo: genSurveyNo(),
        patientId: target.patientId,
        visitId: input.visitId ?? null,
        consultId: input.consultId ?? null,
        sourceType: target.sourceType,
        overallScore: input.overallScore,
        medicalScore: input.medicalScore,
        serviceScore: input.serviceScore,
        environmentScore: input.environmentScore,
        processScore: input.processScore,
        waitScore: input.waitScore,
        comment: input.comment ?? null,
        submittedBy: auth.id,
      },
      tx,
    );
    if (!survey) {
      const existing2 = await findSurveyForTarget(
        { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
        tx,
      );
      if (existing2) return { survey: existing2, created: false };
      throw conflict('满意度评价提交失败，请重试');
    }
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'satisfaction.staff_submit',
        resourceType: 'satisfaction_survey',
        resourceId: survey.id,
        patientRef: target.patientId,
        result: 'success',
        riskLevel: 'low',
        detail: { surveyNo: survey.surveyNo, by: 'staff' },
      },
      tx,
    );
    return { survey, created: true };
  });
}

/** 患者：我的评价。 */
export async function listMySurveys(
  auth: AuthView,
): Promise<SatisfactionSurvey[]> {
  // 患者通过 patient_profiles 映射到自己的 patient_id 集合
  const profileRows = await getDb()`
    SELECT DISTINCT patient_id FROM clinical.patient_profiles WHERE account_id = ${auth.id}
  `;
  const patientIds = (profileRows as Record<string, unknown>[]).map((r) => String(r.patient_id));
  if (patientIds.length === 0) return [];
  const all = await listSurveys();
  return all.filter((s) => patientIds.includes(s.patientId));
}

/** 医护：评价列表（可按患者/来源过滤）。 */
export async function listSurveysForStaff(input: {
  patientId?: string;
  sourceType?: SatisfactionSource;
}): Promise<SatisfactionSurvey[]> {
  return listSurveys({
    patientId: input.patientId,
    sourceType: input.sourceType,
  });
}

export async function getSurveyDetail(
  id: string,
): Promise<SatisfactionSurvey> {
  const survey = await getSurveyById(id);
  if (!survey) throw notFound('评价不存在');
  return survey;
}

/** 满意度统计（医护/管理）。 */
export async function getSatisfactionStats(
  sourceType?: SatisfactionSource,
): Promise<SatisfactionStats> {
  return getSurveyStats(sourceType);
}
