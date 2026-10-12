/**
 * 健澜科技 jlmedaios - 术前评估 repo（M31-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface PreopAssessment {
  id: string; visitId: string; asaGrade: string;
  npoConfirmed: boolean; allergyChecked: boolean; consentSigned: boolean;
  assessmentNote: string | null; createdBy: string; createdAt: string;
}
const COLS = `id, visit_id, asa_grade, npo_confirmed, allergy_checked, consent_signed, assessment_note, created_by, created_at`;

function map(r: Record<string, unknown>): PreopAssessment {
  return {
    id: String(r.id), visitId: String(r.visit_id), asaGrade: String(r.asa_grade),
    npoConfirmed: Boolean(r.npo_confirmed), allergyChecked: Boolean(r.allergy_checked),
    consentSigned: Boolean(r.consent_signed),
    assessmentNote: r.assessment_note ? String(r.assessment_note) : null,
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function create(
  input: { visitId: string; asaGrade: string; npoConfirmed: boolean; allergyChecked: boolean; consentSigned: boolean; assessmentNote?: string | null; createdBy: string },
  tx: DbExecutor = getDb(),
): Promise<PreopAssessment> {
  const rows = await tx`
    INSERT INTO clinical.preop_assessments
      (visit_id, asa_grade, npo_confirmed, allergy_checked, consent_signed, assessment_note, created_by)
    VALUES (${input.visitId}, ${input.asaGrade}, ${input.npoConfirmed}, ${input.allergyChecked}, ${input.consentSigned}, ${input.assessmentNote ?? null}, ${input.createdBy})
    RETURNING ${tx.unsafe(COLS)}
  `;
  return map(rows[0]);
}

export async function listByVisit(visitId: string): Promise<PreopAssessment[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.preop_assessments
    WHERE visit_id = ${visitId} ORDER BY created_at DESC`;
  return rows.map(map);
}
