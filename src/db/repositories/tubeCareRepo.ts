/**
 * 健澜科技 jlmedaios - 管路护理 Repository（M17-C）
 *
 * clinical.tubes / tube_assessments 读写：
 *  - 置入管路(in_place)、按就诊列管路、登记每日评估；
 *  - 拔管 CAS：in_place -> removed（重复拔管返回 null）；
 *  - NQI 周期聚合查询。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { TubeType, TubeStatus, RemovalType, SiteIntegrity } from '../../medical-tools/nursing/tubeCare.js';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface Tube {
  id: string;
  visitId: string;
  patientId: string;
  tubeType: TubeType;
  site: string | null;
  fixationNote: string | null;
  insertedBy: string;
  insertedAt: string;
  status: TubeStatus;
  removedAt: string | null;
  removedBy: string | null;
  removalType: RemovalType | null;
  removalNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const TUBE_COLS = `
  id, visit_id, patient_id, tube_type, site, fixation_note, inserted_by, inserted_at,
  status, removed_at, removed_by, removal_type, removal_note, created_at, updated_at
`;

function mapTube(row: Record<string, unknown>): Tube {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    tubeType: row.tube_type as TubeType,
    site: row.site ? String(row.site) : null,
    fixationNote: row.fixation_note ? String(row.fixation_note) : null,
    insertedBy: String(row.inserted_by),
    insertedAt: String(row.inserted_at),
    status: row.status as TubeStatus,
    removedAt: row.removed_at ? String(row.removed_at) : null,
    removedBy: row.removed_by ? String(row.removed_by) : null,
    removalType: (row.removal_type as RemovalType | null) ?? null,
    removalNote: row.removal_note ? String(row.removal_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface TubeAssessment {
  id: string;
  tubeId: string;
  assessedBy: string | null;
  assessedAt: string;
  siteIntegrity: SiteIntegrity | null;
  fixationSecure: boolean | null;
  riskNote: string | null;
}

const ASSESS_COLS = `id, tube_id, assessed_by, assessed_at, site_integrity, fixation_secure, risk_note`;

function mapAssessment(row: Record<string, unknown>): TubeAssessment {
  return {
    id: String(row.id),
    tubeId: String(row.tube_id),
    assessedBy: row.assessed_by ? String(row.assessed_by) : null,
    assessedAt: String(row.assessed_at),
    siteIntegrity: (row.site_integrity as SiteIntegrity | null) ?? null,
    fixationSecure: row.fixation_secure === null ? null : row.fixation_secure === true,
    riskNote: row.risk_note ? String(row.risk_note) : null,
  };
}

// ---------------------------------------------------------------------------
// 管路 CRUD
// ---------------------------------------------------------------------------

export async function insertTube(
  input: { visitId: string; patientId: string; tubeType: TubeType; site?: string | null; fixationNote?: string | null; insertedBy: string },
  tx: DbExecutor,
): Promise<Tube> {
  const rows = await tx`
    INSERT INTO clinical.tubes (visit_id, patient_id, tube_type, site, fixation_note, inserted_by)
    VALUES (${input.visitId}, ${input.patientId}, ${input.tubeType}, ${input.site ?? null}, ${input.fixationNote ?? null}, ${input.insertedBy})
    RETURNING ${tx.unsafe(TUBE_COLS)}`;
  return mapTube(rows[0] as Record<string, unknown>);
}

export async function getTubeById(id: string, sql?: DbExecutor): Promise<Tube | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(TUBE_COLS)} FROM clinical.tubes WHERE id = ${id}`;
  return rows.length > 0 ? mapTube(rows[0] as Record<string, unknown>) : null;
}

/** 按就诊列管路；visit_id 为 uuid 列，TS 条件拼接，禁止空串占位。 */
export async function listTubes(
  filter: { visitId?: string; status?: string } = {},
  sql?: DbExecutor,
): Promise<Tube[]> {
  const db = sql ?? getDb();
  const conds = [];
  if (filter.visitId) conds.push(db`visit_id = ${filter.visitId}`);
  if (filter.status) conds.push(db`status = ${filter.status}`);
  let where = db``;
  if (conds.length > 0) {
    where = db`WHERE ${conds[0]}`;
    for (let i = 1; i < conds.length; i++) where = db`${where} AND ${conds[i]}`;
  }
  const rows = await db`
    SELECT ${db.unsafe(TUBE_COLS)} FROM clinical.tubes
    ${where}
    ORDER BY inserted_at DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapTube);
}

/** 每日评估登记。 */
export async function insertAssessment(
  input: { tubeId: string; assessedBy: string; siteIntegrity: SiteIntegrity; fixationSecure: boolean; riskNote?: string | null },
  tx: DbExecutor,
): Promise<TubeAssessment> {
  const rows = await tx`
    INSERT INTO clinical.tube_assessments (tube_id, assessed_by, site_integrity, fixation_secure, risk_note)
    VALUES (${input.tubeId}, ${input.assessedBy}, ${input.siteIntegrity}, ${input.fixationSecure}, ${input.riskNote ?? null})
    RETURNING ${tx.unsafe(ASSESS_COLS)}`;
  return mapAssessment(rows[0] as Record<string, unknown>);
}

export async function listAssessmentsByTube(tubeId: string, sql?: DbExecutor): Promise<TubeAssessment[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.tube_assessments WHERE tube_id = ${tubeId} ORDER BY assessed_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapAssessment);
}

/**
 * 拔管 CAS：in_place -> removed。状态不匹配（已拔管）返回 null（重复拔管冲突）。
 * unplanned 的 removal_note 必填由聚合器前置校验。
 */
export async function removeTube(
  id: string, removedBy: string, removalType: RemovalType, removalNote: string | null, tx: DbExecutor,
): Promise<Tube | null> {
  const rows = await tx`
    UPDATE clinical.tubes
    SET status = 'removed', removed_at = now(), removed_by = ${removedBy},
        removal_type = ${removalType}, removal_note = ${removalNote}
    WHERE id = ${id} AND status = 'in_place'
    RETURNING ${tx.unsafe(TUBE_COLS)}`;
  return rows.length > 0 ? mapTube(rows[0] as Record<string, unknown>) : null;
}

/** NQI 全量明细（供纯函数聚合）。 */
export async function listAllTubesForMetrics(sql?: DbExecutor): Promise<Tube[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(TUBE_COLS)} FROM clinical.tubes`;
  return (rows as Record<string, unknown>[]).map(mapTube);
}
