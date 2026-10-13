/**
 * 健澜科技 jlmedaios - 输血反应 repo（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface TransfusionReaction {
  id: string;
  patientId: string;
  transfusionId: string | null;
  reactionType: string;
  severity: string;
  symptoms: string;
  blocked: boolean;
  reportedBy: string;
  createdAt: string;
}

const COLS = `id, patient_id, transfusion_id, reaction_type, severity, symptoms, blocked, reported_by, created_at`;

function mapRow(r: Record<string, unknown>): TransfusionReaction {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    transfusionId: r.transfusion_id == null ? null : String(r.transfusion_id),
    reactionType: String(r.reaction_type),
    severity: String(r.severity),
    symptoms: String(r.symptoms),
    blocked: Boolean(r.blocked),
    reportedBy: String(r.reported_by),
    createdAt: String(r.created_at),
  };
}

export interface ReportInput {
  patientId: string;
  transfusionId?: string | null;
  reactionType: string;
  severity: string;
  symptoms: string;
  blocked: boolean;
  reportedBy: string;
}

export async function reportReaction(input: ReportInput): Promise<TransfusionReaction> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.transfusion_reactions
      (patient_id, transfusion_id, reaction_type, severity, symptoms, blocked, reported_by)
    VALUES (${input.patientId}, ${input.transfusionId ?? null}, ${input.reactionType}, ${input.severity},
      ${input.symptoms}, ${input.blocked ?? false}, ${input.reportedBy})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByPatient(patientId: string): Promise<TransfusionReaction[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.transfusion_reactions
    WHERE patient_id=${patientId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function hasBlockedHistory(patientId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    SELECT 1 FROM clinical.transfusion_reactions
    WHERE patient_id=${patientId} AND blocked=true LIMIT 1`;
  return (rows as unknown[]).length > 0;
}
