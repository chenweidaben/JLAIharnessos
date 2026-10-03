/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引 Repository（M5-C）
 *
 * clinical.patient_identifiers / empi_match_candidates / empi_links 表 CRUD。
 * 患者对按 id 字典序归一，避免重复候选；标识登记与链接写入幂等。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { getDb, type DbExecutor, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder } from './helpers.js';

export type IdentifierDomain =
  | 'mrn' | 'id_card' | 'insurance' | 'phone' | 'wechat' | 'outer';

export interface PatientIdentifier {
  id: string;
  patientId: string;
  domain: IdentifierDomain;
  identifierHash: string;
  identifierLast4: string | null;
  source: string;
  createdAt: string;
}

export interface MatchCandidate {
  id: string;
  patientAId: string;
  patientBId: string;
  matchScore: number;
  matchReasons: string[];
  status: 'pending' | 'confirmed' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface EmpiLink {
  id: string;
  masterPatientId: string;
  linkedPatientId: string;
  candidateId: string | null;
  createdBy: string | null;
  createdAt: string;
}

const IDENT_COLS = `
  id, patient_id, identifier_domain, identifier_hash, identifier_last4,
  source, created_at
`;
const CANDIDATE_COLS = `
  id, patient_a_id, patient_b_id, match_score, match_reasons, status,
  reviewed_by, reviewed_at, created_at
`;
const LINK_COLS = `
  id, master_patient_id, linked_patient_id, candidate_id, created_by, created_at
`;

function parseJson<T>(v: unknown, fallback: T): T {
  if (v != null && typeof v === 'object') return v as T;
  if (typeof v === 'string' && v.trim()) {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return fallback;
}

function mapIdentifier(row: Record<string, unknown>): PatientIdentifier {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    domain: row.identifier_domain as IdentifierDomain,
    identifierHash: String(row.identifier_hash),
    identifierLast4: row.identifier_last4 ? String(row.identifier_last4) : null,
    source: String(row.source ?? 'local'),
    createdAt: String(row.created_at),
  };
}

function mapCandidate(row: Record<string, unknown>): MatchCandidate {
  return {
    id: String(row.id),
    patientAId: String(row.patient_a_id),
    patientBId: String(row.patient_b_id),
    matchScore: Number(row.match_score ?? 0),
    matchReasons: parseJson<string[]>(row.match_reasons, []),
    status: row.status as MatchCandidate['status'],
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapLink(row: Record<string, unknown>): EmpiLink {
  return {
    id: String(row.id),
    masterPatientId: String(row.master_patient_id),
    linkedPatientId: String(row.linked_patient_id),
    candidateId: row.candidate_id ? String(row.candidate_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

/* ----------------------------- 标识登记 ----------------------------- */

export async function registerIdentifier(
  input: {
    patientId: string;
    domain: IdentifierDomain;
    identifierHash: string;
    identifierLast4?: string | null;
    source?: string;
  },
  sql?: DbExecutor,
): Promise<PatientIdentifier | null> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.patient_identifiers
      (patient_id, identifier_domain, identifier_hash, identifier_last4, source)
    VALUES (
      ${input.patientId}, ${input.domain}, ${input.identifierHash},
      ${input.identifierLast4 ?? null}, ${input.source ?? 'local'}
    )
    ON CONFLICT (identifier_domain, identifier_hash) DO NOTHING
    RETURNING ${db.unsafe(IDENT_COLS)}
  `;
  return rows.length > 0 ? mapIdentifier(rows[0] as Record<string, unknown>) : null;
}

export async function listIdentifiersByPatient(
  patientId: string,
  sql?: DbExecutor,
): Promise<PatientIdentifier[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(IDENT_COLS)} FROM clinical.patient_identifiers
    WHERE patient_id = ${patientId} ORDER BY created_at
  `;
  return (rows as Record<string, unknown>[]).map(mapIdentifier);
}

export async function listAllIdentifiers(sql?: Sql): Promise<PatientIdentifier[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(IDENT_COLS)} FROM clinical.patient_identifiers
  `;
  return (rows as Record<string, unknown>[]).map(mapIdentifier);
}

/* ----------------------------- 匹配候选 ----------------------------- */

/** 患者对按 id 字典序归一。 */
export function normalizePair(
  a: string,
  b: string,
): { first: string; second: string } {
  return a < b ? { first: a, second: b } : { first: b, second: a };
}

/** 写入候选（幂等：同一对已存在则返回 null）。 */
export async function insertCandidate(
  input: {
    patientAId: string;
    patientBId: string;
    matchScore: number;
    matchReasons: string[];
  },
  sql?: DbExecutor,
): Promise<MatchCandidate | null> {
  const db = sql ?? getDb();
  const { first, second } = normalizePair(input.patientAId, input.patientBId);
  const rows = await db`
    INSERT INTO clinical.empi_match_candidates
      (patient_a_id, patient_b_id, match_score, match_reasons)
    VALUES (
      ${first}, ${second}, ${input.matchScore},
      ${db.json(JSON.stringify(input.matchReasons))}
    )
    ON CONFLICT (patient_a_id, patient_b_id) DO NOTHING
    RETURNING ${db.unsafe(CANDIDATE_COLS)}
  `;
  return rows.length > 0 ? mapCandidate(rows[0] as Record<string, unknown>) : null;
}

export async function getCandidateById(
  id: string,
  sql?: DbExecutor,
): Promise<MatchCandidate | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(CANDIDATE_COLS)} FROM clinical.empi_match_candidates
    WHERE id = ${id}
  `;
  return rows.length > 0 ? mapCandidate(rows[0] as Record<string, unknown>) : null;
}

export async function listCandidates(
  options?: { status?: string; limit?: number; offset?: number },
  sql?: Sql,
): Promise<MatchCandidate[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder();
  if (options?.status) qb.where('status = ?', options.status);
  return dynamicSelect<Record<string, unknown>>(
    db, CANDIDATE_COLS, 'clinical.empi_match_candidates', qb,
    'match_score DESC, created_at DESC',
    options?.limit ?? 100, options?.offset ?? 0,
  ).then((rows) => rows.map(mapCandidate));
}

/** 审核候选：确认或拒绝（由聚合器保证 pending 状态）。 */
export async function reviewCandidate(
  id: string,
  status: 'confirmed' | 'rejected',
  reviewerId: string,
  sql?: DbExecutor,
): Promise<MatchCandidate | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.empi_match_candidates
    SET status = ${status}, reviewed_by = ${reviewerId}, reviewed_at = now()
    WHERE id = ${id}
    RETURNING ${db.unsafe(CANDIDATE_COLS)}
  `;
  return rows.length > 0 ? mapCandidate(rows[0] as Record<string, unknown>) : null;
}

/* ----------------------------- 逻辑链接 ----------------------------- */

export async function insertLink(
  input: {
    masterPatientId: string;
    linkedPatientId: string;
    candidateId?: string | null;
    createdBy: string;
  },
  sql?: DbExecutor,
): Promise<EmpiLink | null> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.empi_links
      (master_patient_id, linked_patient_id, candidate_id, created_by)
    VALUES (
      ${input.masterPatientId}, ${input.linkedPatientId},
      ${input.candidateId ?? null}, ${input.createdBy}
    )
    ON CONFLICT (linked_patient_id) DO NOTHING
    RETURNING ${db.unsafe(LINK_COLS)}
  `;
  return rows.length > 0 ? mapLink(rows[0] as Record<string, unknown>) : null;
}

export async function listLinks(sql?: Sql): Promise<EmpiLink[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(LINK_COLS)} FROM clinical.empi_links
  `;
  return (rows as Record<string, unknown>[]).map(mapLink);
}

export async function getLinkByLinkedPatient(
  patientId: string,
  sql?: DbExecutor,
): Promise<EmpiLink | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(LINK_COLS)} FROM clinical.empi_links
    WHERE linked_patient_id = ${patientId}
  `;
  return rows.length > 0 ? mapLink(rows[0] as Record<string, unknown>) : null;
}
