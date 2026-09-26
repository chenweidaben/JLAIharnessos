/**
 * 健澜科技 jlmedaios - 医生查房记录 Repository（M1-B2）
 * clinical.ward_rounds 表 CRUD 与状态流转。
 *
 * 状态机：
 *   draft（草稿）──sign(记录医师本人签名)──► signed（已签名）
 *                                              │
 *              is_superior 上级查房：countersign(上级医师审签) ──► countersigned
 *   draft/signed ──return(上级退回，附原因)──► returned
 *
 * 严谨性：
 *  - 查房记录必须本人签名（sign 时 signed_by=author），AI 仅辅助、不得代签；
 *  - 上级查房须上级医师审签；护士不可创建/签名/审签（角色判定在聚合器）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type WardRoundType = 'routine' | 'superior' | 'attending' | 'chief' | 'director';
export type WardRoundStatus = 'draft' | 'signed' | 'countersigned' | 'returned';

export interface WardRound {
  id: string;
  visitId: string;
  patientId: string;
  roundNo: string;
  roundType: WardRoundType;
  isSuperior: boolean;
  roundAt: string;
  symptomChange: string | null;
  physicalExam: Record<string, unknown>;
  assessment: string;
  diagnosis: string | null;
  planAdjustment: string | null;
  aiAssisted: boolean;
  aiSuggestion: Record<string, unknown>;
  status: WardRoundStatus;
  authorId: string | null;
  signedBy: string | null;
  signedAt: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
  returnReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WardRoundInput {
  visitId: string;
  patientId: string;
  roundType?: WardRoundType;
  isSuperior?: boolean;
  roundAt?: string | null;
  symptomChange?: string | null;
  physicalExam?: Record<string, unknown>;
  assessment: string;
  diagnosis?: string | null;
  planAdjustment?: string | null;
  aiAssisted?: boolean;
  aiSuggestion?: Record<string, unknown>;
  authorId: string;
}

const SELECT_COLS = `id, visit_id, patient_id, round_no, round_type, is_superior, round_at,
  symptom_change, physical_exam, assessment, diagnosis, plan_adjustment, ai_assisted,
  ai_suggestion, status, author_id, signed_by, signed_at, countersigned_by,
  countersigned_at, return_reason, version, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): WardRound {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    roundNo: String(row.round_no),
    roundType: row.round_type as WardRoundType,
    isSuperior: Boolean(row.is_superior),
    roundAt: String(row.round_at),
    symptomChange: row.symptom_change ? String(row.symptom_change) : null,
    physicalExam: (row.physical_exam as Record<string, unknown>) ?? {},
    assessment: String(row.assessment),
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    planAdjustment: row.plan_adjustment ? String(row.plan_adjustment) : null,
    aiAssisted: Boolean(row.ai_assisted),
    aiSuggestion: (row.ai_suggestion as Record<string, unknown>) ?? {},
    status: row.status as WardRoundStatus,
    authorId: row.author_id ? String(row.author_id) : null,
    signedBy: row.signed_by ? String(row.signed_by) : null,
    signedAt: row.signed_at ? String(row.signed_at) : null,
    countersignedBy: row.countersigned_by ? String(row.countersigned_by) : null,
    countersignedAt: row.countersigned_at ? String(row.countersigned_at) : null,
    returnReason: row.return_reason ? String(row.return_reason) : null,
    version: Number(row.version ?? 1),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function generateRoundNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const hms = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  return `WR${ymd}${hms}${Math.floor(Math.random() * 900) + 100}`;
}

/** 创建查房草稿（status=draft）。 */
export async function createWardRound(input: WardRoundInput, db?: DbExecutor): Promise<WardRound> {
  const exec = db ?? getDb();
  const roundType = input.roundType ?? 'routine';
  const isSuperior = input.isSuperior ?? roundType !== 'routine';
  const rows = await exec`
    INSERT INTO clinical.ward_rounds (
      visit_id, patient_id, round_no, round_type, is_superior, round_at, symptom_change,
      physical_exam, assessment, diagnosis, plan_adjustment, ai_assisted, ai_suggestion,
      status, author_id
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${generateRoundNo()}, ${roundType}, ${isSuperior},
      ${input.roundAt ?? new Date().toISOString()}, ${input.symptomChange ?? null},
      ${exec.json(toJson(input.physicalExam ?? {}))}, ${input.assessment},
      ${input.diagnosis ?? null}, ${input.planAdjustment ?? null},
      ${input.aiAssisted ?? false}, ${exec.json(toJson(input.aiSuggestion ?? {}))},
      'draft', ${input.authorId}
    )
    RETURNING ${exec.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getWardRoundById(id: string, db?: DbExecutor): Promise<WardRound | null> {
  const exec = db ?? getDb();
  const rows = await exec`SELECT ${exec.unsafe(SELECT_COLS)} FROM clinical.ward_rounds WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 某就诊查房记录（时间倒序）。 */
export async function listWardRoundsByVisit(visitId: string, db?: DbExecutor): Promise<WardRound[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(SELECT_COLS)} FROM clinical.ward_rounds
    WHERE visit_id = ${visitId} AND deleted_at IS NULL
    ORDER BY round_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 某患者查房记录（时间倒序，跨就诊）。 */
export async function listWardRoundsByPatient(patientId: string, db?: DbExecutor): Promise<WardRound[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(SELECT_COLS)} FROM clinical.ward_rounds
    WHERE patient_id = ${patientId} AND deleted_at IS NULL
    ORDER BY round_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/**
 * 本人签名：draft → signed。
 * CAS 限定 status='draft'，且 signed_by 必须为记录作者本人（防代签）。
 */
export async function signWardRound(
  id: string, signerId: string, db?: DbExecutor,
): Promise<WardRound | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.ward_rounds
    SET status = 'signed', signed_by = ${signerId}, signed_at = now(),
        version = version + 1, updated_at = now()
    WHERE id = ${id} AND status = 'draft' AND author_id = ${signerId}
    RETURNING ${exec.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * 上级审签：signed → countersigned（仅上级查房 is_superior=true 需此步）。
 * 审签人不得为记录作者本人（须上级/第二人）。
 */
export async function countersignWardRound(
  id: string, superiorId: string, db?: DbExecutor,
): Promise<WardRound | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.ward_rounds
    SET status = 'countersigned', countersigned_by = ${superiorId},
        countersigned_at = now(), version = version + 1, updated_at = now()
    WHERE id = ${id} AND status = 'signed' AND is_superior = true
      AND author_id IS DISTINCT FROM ${superiorId}
    RETURNING ${exec.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 上级退回：draft/signed → returned，记录退回原因。 */
export async function returnWardRound(
  id: string, superiorId: string, reason: string, db?: DbExecutor,
): Promise<WardRound | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.ward_rounds
    SET status = 'returned', return_reason = ${reason},
        countersigned_by = ${superiorId}, version = version + 1, updated_at = now()
    WHERE id = ${id} AND status IN ('draft','signed')
    RETURNING ${exec.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}
