/**
 * 健澜科技 jlmedaios - 满意度评价 Repository（M3-O）
 *
 * clinical.satisfaction_surveys 读写。
 * 并发：一次就诊/问诊仅可评价一次（部分唯一索引），插入冲突回查。
 * 查询风格：postgres.js tagged template / unsafe（与全仓库一致）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type SatisfactionSource = 'outpatient' | 'inpatient' | 'consultation';

export interface SatisfactionSurvey {
  id: string;
  surveyNo: string;
  patientId: string;
  visitId: string | null;
  consultId: string | null;
  sourceType: SatisfactionSource;
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment: string | null;
  status: 'submitted';
  submittedBy: string | null;
  submittedAt: string;
}

export interface SatisfactionStats {
  total: number;
  overallAvg: number;
  medicalAvg: number;
  serviceAvg: number;
  environmentAvg: number;
  processAvg: number;
  waitAvg: number;
  positiveRate: number;
}

const SCOLS = `
  id, survey_no, patient_id, visit_id, consult_id, source_type,
  overall_score, medical_score, service_score, environment_score,
  process_score, wait_score, comment, status, submitted_by, submitted_at
`;

function mapS(r: Record<string, unknown>): SatisfactionSurvey {
  return {
    id: String(r.id),
    surveyNo: String(r.survey_no),
    patientId: String(r.patient_id),
    visitId: r.visit_id ? String(r.visit_id) : null,
    consultId: r.consult_id ? String(r.consult_id) : null,
    sourceType: r.source_type as SatisfactionSource,
    overallScore: Number(r.overall_score),
    medicalScore: Number(r.medical_score),
    serviceScore: Number(r.service_score),
    environmentScore: Number(r.environment_score),
    processScore: Number(r.process_score),
    waitScore: Number(r.wait_score),
    comment: r.comment ? String(r.comment) : null,
    status: 'submitted',
    submittedBy: r.submitted_by ? String(r.submitted_by) : null,
    submittedAt: String(r.submitted_at),
  };
}

export interface CreateSurveyInput {
  surveyNo: string;
  patientId: string;
  visitId?: string | null;
  consultId?: string | null;
  sourceType: SatisfactionSource;
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment?: string | null;
  submittedBy: string;
}

/** 插入满意度评价；唯一冲突（同就诊/问诊已评价）时返回 null 由聚合器处理。 */
export async function insertSurvey(
  input: CreateSurveyInput,
  tx: DbExecutor,
): Promise<SatisfactionSurvey | null> {
  try {
    const rows = await tx`
      INSERT INTO clinical.satisfaction_surveys
        (survey_no, patient_id, visit_id, consult_id, source_type,
         overall_score, medical_score, service_score, environment_score,
         process_score, wait_score, comment, submitted_by)
      VALUES
        (${input.surveyNo}, ${input.patientId}, ${input.visitId ?? null}, ${input.consultId ?? null},
         ${input.sourceType}, ${input.overallScore}, ${input.medicalScore}, ${input.serviceScore},
         ${input.environmentScore}, ${input.processScore}, ${input.waitScore},
         ${input.comment ?? null}, ${input.submittedBy})
      RETURNING ${tx.unsafe(SCOLS)}
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? mapS(row) : null;
  } catch (err) {
    if (err instanceof Error && /duplicate key|unique violation/i.test(err.message)) {
      return null;
    }
    throw err;
  }
}

/** 按就诊/问诊查找已有评价（用于唯一冲突回查）。 */
export async function findSurveyForTarget(
  input: { visitId?: string | null; consultId?: string | null },
  tx?: DbExecutor,
): Promise<SatisfactionSurvey | null> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SCOLS)} FROM clinical.satisfaction_surveys
     WHERE (visit_id IS NOT NULL AND visit_id = ${input.visitId ?? null})
        OR (consult_id IS NOT NULL AND consult_id = ${input.consultId ?? null})
     LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapS(row) : null;
}

export async function getSurveyById(id: string, tx?: DbExecutor): Promise<SatisfactionSurvey | null> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SCOLS)} FROM clinical.satisfaction_surveys WHERE id = ${id}
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapS(row) : null;
}

export interface ListSurveysFilter {
  patientId?: string;
  sourceType?: SatisfactionSource;
}

export async function listSurveys(filter: ListSurveysFilter = {}): Promise<SatisfactionSurvey[]> {
  const db = getDb();
  if (filter.patientId && filter.sourceType) {
    const rows = await db`
      SELECT ${db.unsafe(SCOLS)} FROM clinical.satisfaction_surveys
       WHERE patient_id = ${filter.patientId} AND source_type = ${filter.sourceType}
       ORDER BY submitted_at DESC
    `;
    return (rows as Record<string, unknown>[]).map(mapS);
  }
  if (filter.patientId) {
    const rows = await db`
      SELECT ${db.unsafe(SCOLS)} FROM clinical.satisfaction_surveys
       WHERE patient_id = ${filter.patientId} ORDER BY submitted_at DESC
    `;
    return (rows as Record<string, unknown>[]).map(mapS);
  }
  if (filter.sourceType) {
    const rows = await db`
      SELECT ${db.unsafe(SCOLS)} FROM clinical.satisfaction_surveys
       WHERE source_type = ${filter.sourceType} ORDER BY submitted_at DESC
    `;
    return (rows as Record<string, unknown>[]).map(mapS);
  }
  const rows = await db`
    SELECT ${db.unsafe(SCOLS)} FROM clinical.satisfaction_surveys ORDER BY submitted_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapS);
}

/** 满意度统计（可按来源过滤）：平均分、好评率（overall>=4 占比）。 */
export async function getSurveyStats(sourceType?: SatisfactionSource): Promise<SatisfactionStats> {
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (sourceType) {
    rows = await db`
      SELECT
        count(*)::int AS total,
        round(avg(overall_score)::numeric, 2)::float AS overall_avg,
        round(avg(medical_score)::numeric, 2)::float AS medical_avg,
        round(avg(service_score)::numeric, 2)::float AS service_avg,
        round(avg(environment_score)::numeric, 2)::float AS environment_avg,
        round(avg(process_score)::numeric, 2)::float AS process_avg,
        round(avg(wait_score)::numeric, 2)::float AS wait_avg,
        round((count(*) FILTER (WHERE overall_score >= 4)::float / NULLIF(count(*),0) * 100)::numeric, 1)::float AS positive_rate
      FROM clinical.satisfaction_surveys WHERE source_type = ${sourceType}
    `;
  } else {
    rows = await db`
      SELECT
        count(*)::int AS total,
        round(avg(overall_score)::numeric, 2)::float AS overall_avg,
        round(avg(medical_score)::numeric, 2)::float AS medical_avg,
        round(avg(service_score)::numeric, 2)::float AS service_avg,
        round(avg(environment_score)::numeric, 2)::float AS environment_avg,
        round(avg(process_score)::numeric, 2)::float AS process_avg,
        round(avg(wait_score)::numeric, 2)::float AS wait_avg,
        round((count(*) FILTER (WHERE overall_score >= 4)::float / NULLIF(count(*),0) * 100)::numeric, 1)::float AS positive_rate
      FROM clinical.satisfaction_surveys
    `;
  }
  const r = rows[0];
  if (!r || Number(r.total) === 0) {
    return {
      total: 0, overallAvg: 0, medicalAvg: 0, serviceAvg: 0,
      environmentAvg: 0, processAvg: 0, waitAvg: 0, positiveRate: 0,
    };
  }
  return {
    total: Number(r.total),
    overallAvg: Number(r.overall_avg),
    medicalAvg: Number(r.medical_avg),
    serviceAvg: Number(r.service_avg),
    environmentAvg: Number(r.environment_avg),
    processAvg: Number(r.process_avg),
    waitAvg: Number(r.wait_avg),
    positiveRate: Number(r.positive_rate),
  };
}
