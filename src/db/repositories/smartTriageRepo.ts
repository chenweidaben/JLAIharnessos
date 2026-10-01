/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊 Repository（M3-P）
 *
 * postgres.js tagged template 访问，无 ORM。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { DepartmentRecommendation } from '../../knowledge/rules/departmentTriageRules.js';

/** 导诊会话行 */
export interface TriageSessionRow {
  id: string;
  accountId: string | null;
  patientId: string | null;
  symptoms: string;
  dialog: { role: string; content: string }[];
  recommendations: DepartmentRecommendation[];
  chosenDepartment: string | null;
  engineType: 'rule' | 'llm' | 'hybrid';
  status: 'open' | 'completed';
  createdAt: string;
  completedAt: string | null;
}

/** 预问诊报告行 */
export interface PreliminaryConsultationRow {
  id: string;
  triageSessionId: string | null;
  accountId: string | null;
  patientId: string | null;
  targetDepartment: string | null;
  chiefComplaint: string | null;
  presentIllness: string | null;
  pastHistory: string | null;
  medications: string | null;
  allergies: string | null;
  structured: Record<string, unknown>;
  reportText: string | null;
  engineType: 'form' | 'llm' | 'hybrid';
  status: 'draft' | 'completed' | 'consumed';
  createdAt: string;
  completedAt: string | null;
}

function mapSession(r: Record<string, unknown>): TriageSessionRow {
  return {
    id: String(r.id),
    accountId: r.account_id ? String(r.account_id) : null,
    patientId: r.patient_id ? String(r.patient_id) : null,
    symptoms: String(r.symptoms),
    dialog: (r.dialog as TriageSessionRow['dialog']) ?? [],
    recommendations: (r.recommendations as TriageSessionRow['recommendations']) ?? [],
    chosenDepartment: r.chosen_department ? String(r.chosen_department) : null,
    engineType: r.engine_type as TriageSessionRow['engineType'],
    status: r.status as TriageSessionRow['status'],
    createdAt: String(r.created_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
  };
}

function mapPreliminary(r: Record<string, unknown>): PreliminaryConsultationRow {
  return {
    id: String(r.id),
    triageSessionId: r.triage_session_id ? String(r.triage_session_id) : null,
    accountId: r.account_id ? String(r.account_id) : null,
    patientId: r.patient_id ? String(r.patient_id) : null,
    targetDepartment: r.target_department ? String(r.target_department) : null,
    chiefComplaint: r.chief_complaint ? String(r.chief_complaint) : null,
    presentIllness: r.present_illness ? String(r.present_illness) : null,
    pastHistory: r.past_history ? String(r.past_history) : null,
    medications: r.medications ? String(r.medications) : null,
    allergies: r.allergies ? String(r.allergies) : null,
    structured: (r.structured as Record<string, unknown>) ?? {},
    reportText: r.report_text ? String(r.report_text) : null,
    engineType: r.engine_type as PreliminaryConsultationRow['engineType'],
    status: r.status as PreliminaryConsultationRow['status'],
    createdAt: String(r.created_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
  };
}

export async function createTriageSession(
  input: {
    accountId: string | null;
    patientId: string | null;
    symptoms: string;
    recommendations: DepartmentRecommendation[];
    engineType: TriageSessionRow['engineType'];
  },
  tx?: DbExecutor,
): Promise<TriageSessionRow> {
  const db = tx ?? getDb();
  const rows = await db`
    INSERT INTO clinical.triage_sessions (
      account_id, patient_id, symptoms, recommendations, engine_type
    ) VALUES (
      ${input.accountId}, ${input.patientId}, ${input.symptoms},
      ${JSON.stringify(input.recommendations)}::jsonb, ${input.engineType}
    )
    RETURNING *
  `;
  return mapSession(rows[0] as Record<string, unknown>);
}

export async function getTriageSessionById(
  id: string,
  tx?: DbExecutor,
): Promise<TriageSessionRow | null> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT * FROM clinical.triage_sessions WHERE id = ${id}
  `;
  return rows.length ? mapSession(rows[0] as Record<string, unknown>) : null;
}

export async function appendDialogAndChoose(
  id: string,
  input: {
    reply?: { role: string; content: string };
    chosenDepartment?: string;
    complete?: boolean;
  },
  tx?: DbExecutor,
): Promise<TriageSessionRow | null> {
  const db = tx ?? getDb();
  const replyJson = input.reply ? JSON.stringify(input.reply) : null;
  const rows = await db`
    UPDATE clinical.triage_sessions
    SET
      dialog = CASE WHEN ${replyJson}::jsonb IS NULL THEN dialog
        ELSE dialog || ${replyJson}::jsonb END,
      chosen_department = COALESCE(${input.chosenDepartment ?? null}, chosen_department),
      status = CASE WHEN ${input.complete ?? false} THEN 'completed' ELSE status END,
      completed_at = CASE WHEN ${input.complete ?? false} THEN now() ELSE completed_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length ? mapSession(rows[0] as Record<string, unknown>) : null;
}

export async function listTriageSessions(
  filter: { accountId?: string; status?: string; limit?: number },
  tx?: DbExecutor,
): Promise<TriageSessionRow[]> {
  const db = tx ?? getDb();
  const limit = filter.limit ?? 50;
  let rows;
  if (filter.accountId) {
    rows = await db`
      SELECT * FROM clinical.triage_sessions
      WHERE account_id = ${filter.accountId}
        ${filter.status ? db`AND status = ${filter.status}` : db``}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  } else {
    rows = await db`
      SELECT * FROM clinical.triage_sessions
      ${filter.status ? db`WHERE status = ${filter.status}` : db``}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  }
  return (rows as Record<string, unknown>[]).map(mapSession);
}

export async function createPreliminaryConsultation(
  input: {
    triageSessionId: string | null;
    accountId: string | null;
    patientId: string | null;
    targetDepartment: string | null;
    reportText: string;
    engineType: PreliminaryConsultationRow['engineType'];
    fields: {
      chiefComplaint: string;
      presentIllness: string;
      pastHistory?: string | null;
      medications?: string | null;
      allergies?: string | null;
      structured?: Record<string, unknown>;
    };
  },
  tx?: DbExecutor,
): Promise<PreliminaryConsultationRow> {
  const db = tx ?? getDb();
  const rows = await db`
    INSERT INTO clinical.preliminary_consultations (
      triage_session_id, account_id, patient_id, target_department,
      chief_complaint, present_illness, past_history, medications, allergies,
      structured, report_text, engine_type, status, completed_at
    ) VALUES (
      ${input.triageSessionId}, ${input.accountId}, ${input.patientId}, ${input.targetDepartment},
      ${input.fields.chiefComplaint}, ${input.fields.presentIllness},
      ${input.fields.pastHistory ?? null}, ${input.fields.medications ?? null}, ${input.fields.allergies ?? null},
      ${JSON.stringify(input.fields.structured ?? {})}::jsonb, ${input.reportText},
      ${input.engineType}, 'completed', now()
    )
    RETURNING *
  `;
  return mapPreliminary(rows[0] as Record<string, unknown>);
}

export async function getPreliminaryConsultationById(
  id: string,
  tx?: DbExecutor,
): Promise<PreliminaryConsultationRow | null> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT * FROM clinical.preliminary_consultations WHERE id = ${id}
  `;
  return rows.length ? mapPreliminary(rows[0] as Record<string, unknown>) : null;
}

export async function listPreliminaryConsultations(
  filter: { patientId?: string; triageSessionId?: string; status?: string },
  tx?: DbExecutor,
): Promise<PreliminaryConsultationRow[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT * FROM clinical.preliminary_consultations
    WHERE 1=1
      ${filter.patientId ? db`AND patient_id = ${filter.patientId}` : db``}
      ${filter.triageSessionId ? db`AND triage_session_id = ${filter.triageSessionId}` : db``}
      ${filter.status ? db`AND status = ${filter.status}` : db``}
    ORDER BY created_at DESC LIMIT 100
  `;
  return (rows as Record<string, unknown>[]).map(mapPreliminary);
}

export async function markPreliminaryConsumed(
  id: string,
  tx?: DbExecutor,
): Promise<PreliminaryConsultationRow | null> {
  const db = tx ?? getDb();
  const rows = await db`
    UPDATE clinical.preliminary_consultations
    SET status = 'consumed' WHERE id = ${id}
    RETURNING *
  `;
  return rows.length ? mapPreliminary(rows[0] as Record<string, unknown>) : null;
}
