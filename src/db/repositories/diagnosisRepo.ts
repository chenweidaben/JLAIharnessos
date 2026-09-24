/**
 * 健澜科技数智医院智能体 - 门诊诊断 Repository
 * clinical.diagnoses 表 CRUD，支持新增 / 删除 / 确认。
 * Copyright (c) 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder } from './helpers.js';

export type DiagnosisKind = 'primary' | 'secondary' | 'differential';

export interface Diagnosis {
  id: string;
  visitId: string;
  patientId: string;
  code: string | null;
  name: string;
  kind: DiagnosisKind;
  confirmed: boolean;
  note: string | null;
  doctorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisCreateInput {
  visitId: string;
  patientId: string;
  code?: string | null;
  name: string;
  kind?: DiagnosisKind;
  confirmed?: boolean;
  note?: string | null;
  doctorId?: string | null;
}

const SELECT_COLS = `id, visit_id, patient_id, code, name, kind, confirmed, note, doctor_id, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): Diagnosis {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    code: row.code ? String(row.code) : null,
    name: String(row.name),
    kind: row.kind as DiagnosisKind,
    confirmed: Boolean(row.confirmed),
    note: row.note ? String(row.note) : null,
    doctorId: row.doctor_id ? String(row.doctor_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createDiagnosis(input: DiagnosisCreateInput, sql?: Sql): Promise<Diagnosis> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.diagnoses (visit_id, patient_id, code, name, kind, confirmed, note, doctor_id)
    VALUES (${input.visitId}, ${input.patientId}, ${input.code ?? null}, ${input.name},
      ${input.kind ?? 'primary'}, ${input.confirmed ?? false}, ${input.note ?? null},
      ${input.doctorId ?? null})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getDiagnosisById(id: string, sql?: Sql): Promise<Diagnosis | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.diagnoses WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getDiagnosesByVisit(visitId: string, sql?: Sql): Promise<Diagnosis[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('visit_id = ?', visitId);
  const rows = await dynamicSelect<Record<string, unknown>>(
    db,
    SELECT_COLS,
    'clinical.diagnoses',
    qb,
    'created_at ASC',
    200,
  );
  return rows.map(mapRow);
}

export async function updateDiagnosisConfirmed(
  id: string,
  confirmed: boolean,
  sql?: Sql,
): Promise<Diagnosis | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.diagnoses SET confirmed = ${confirmed}, updated_at = now()
    WHERE id = ${id} RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function deleteDiagnosis(id: string, sql?: Sql): Promise<boolean> {
  const db = sql ?? getDb();
  const rows = await db`DELETE FROM clinical.diagnoses WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
