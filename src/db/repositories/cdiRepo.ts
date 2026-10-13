/**
 * 健澜科技 jlmedaios - CDI 审查 repo（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface CdiReview {
  id: string;
  patientId: string;
  visitId: string | null;
  drugName: string;
  reviewType: string;
  severity: string;
  message: string;
  resolved: boolean;
  reviewedBy: string;
  createdAt: string;
}

const COLS = `id, patient_id, visit_id, drug_name, review_type, severity, message, resolved, reviewed_by, created_at`;

function mapRow(r: Record<string, unknown>): CdiReview {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    visitId: r.visit_id == null ? null : String(r.visit_id),
    drugName: String(r.drug_name),
    reviewType: String(r.review_type),
    severity: String(r.severity),
    message: String(r.message),
    resolved: Boolean(r.resolved),
    reviewedBy: String(r.reviewed_by),
    createdAt: String(r.created_at),
  };
}

export interface RecordInput {
  patientId: string;
  visitId?: string | null;
  drugName: string;
  reviewType: string;
  severity: string;
  message: string;
  reviewedBy: string;
}

export async function recordReview(input: RecordInput): Promise<CdiReview> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.cdi_reviews
      (patient_id, visit_id, drug_name, review_type, severity, message, reviewed_by)
    VALUES (${input.patientId}, ${input.visitId ?? null}, ${input.drugName}, ${input.reviewType},
      ${input.severity}, ${input.message}, ${input.reviewedBy})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByPatient(patientId: string): Promise<CdiReview[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.cdi_reviews
    WHERE patient_id=${patientId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function resolveReview(id: string): Promise<CdiReview> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.cdi_reviews SET resolved=true WHERE id=${id} RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}
