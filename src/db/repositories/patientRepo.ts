/**
 * 健澜科技数智医院智能体 - 患者 Repository
 *
 * clinical.patients 表 CRUD。敏感字段按安全策略加密/脱敏，查询默认返回脱敏视图。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export interface Patient {
  id: string;
  mrn: string;
  nameMasked: string;
  nameEnc: string | null;
  gender: string;
  birthDate: string | null;
  idCardHash: string | null;
  phoneEnc: string | null;
  bloodType: string | null;
  allergies: Array<Record<string, unknown>>;
  pastHistory: Array<Record<string, unknown>>;
  tags: string[];
  dataLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientCreateInput {
  mrn: string;
  nameMasked: string;
  nameEnc?: string | null;
  gender: '男' | '女' | '未知' | '未说明';
  birthDate?: string | null;
  idCardHash?: string | null;
  phoneEnc?: string | null;
  bloodType?: string | null;
  allergies?: Array<Record<string, unknown>>;
  pastHistory?: Array<Record<string, unknown>>;
  tags?: string[];
  dataLevel?: number;
}

const SELECT_COLS = `
  id, mrn, name_masked, name_enc, gender, birth_date, id_card_hash,
  phone_enc, blood_type, allergies, past_history, tags, data_level,
  created_at, updated_at
`;

function mapRow(row: Record<string, unknown>): Patient {
  return {
    id: String(row.id),
    mrn: String(row.mrn),
    nameMasked: String(row.name_masked),
    nameEnc: row.name_enc ? String(row.name_enc) : null,
    gender: String(row.gender),
    birthDate: row.birth_date ? String(row.birth_date) : null,
    idCardHash: row.id_card_hash ? String(row.id_card_hash) : null,
    phoneEnc: row.phone_enc ? String(row.phone_enc) : null,
    bloodType: row.blood_type ? String(row.blood_type) : null,
    allergies: (row.allergies as Array<Record<string, unknown>>) ?? [],
    pastHistory: (row.past_history as Array<Record<string, unknown>>) ?? [],
    tags: (row.tags as string[]) ?? [],
    dataLevel: Number(row.data_level),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createPatient(input: PatientCreateInput, sql?: Sql): Promise<Patient> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.patients (
      mrn, name_masked, name_enc, gender, birth_date, id_card_hash,
      phone_enc, blood_type, allergies, past_history, tags, data_level
    ) VALUES (
      ${input.mrn}, ${input.nameMasked}, ${input.nameEnc ?? null},
      ${input.gender}, ${input.birthDate ?? null}, ${input.idCardHash ?? null},
      ${input.phoneEnc ?? null}, ${input.bloodType ?? null},
      ${db.json(toJson(input.allergies ?? []))}, ${db.json(toJson(input.pastHistory ?? []))},
      ${db.json(toJson(input.tags ?? []))}, ${input.dataLevel ?? 3}
    )
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getPatientById(id: string, sql?: Sql): Promise<Patient | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.patients
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getPatientByMrn(mrn: string, sql?: Sql): Promise<Patient | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.patients
    WHERE mrn = ${mrn} AND deleted_at IS NULL
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export interface PatientQuery {
  keyword?: string;
  gender?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export async function queryPatients(query: PatientQuery, sql?: Sql): Promise<Patient[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().whereRaw('deleted_at IS NULL');
  if (query.keyword) qb.where('name_masked ILIKE ?', '%' + query.keyword + '%');
  if (query.gender) qb.where('gender = ?', query.gender);
  if (query.tag) qb.whereRaw(`tags @> '"${query.tag}"'::jsonb`);

  const rows = await dynamicSelect<Record<string, unknown>>(
    db, SELECT_COLS, 'clinical.patients', qb, 'updated_at DESC',
    query.limit ?? 50, query.offset ?? 0,
  );
  return rows.map(mapRow);
}

export async function updatePatient(
  id: string,
  patch: Partial<PatientCreateInput>,
  sql?: Sql,
): Promise<Patient | null> {
  const db = sql ?? getDb();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.nameMasked !== undefined) { params.push(patch.nameMasked); sets.push(`name_masked = $${params.length}`); }
  if (patch.gender !== undefined) { params.push(patch.gender); sets.push(`gender = $${params.length}`); }
  if (patch.birthDate !== undefined) { params.push(patch.birthDate); sets.push(`birth_date = $${params.length}`); }
  if (patch.phoneEnc !== undefined) { params.push(patch.phoneEnc); sets.push(`phone_enc = $${params.length}`); }
  if (patch.bloodType !== undefined) { params.push(patch.bloodType); sets.push(`blood_type = $${params.length}`); }
  if (patch.allergies !== undefined) { params.push(db.json(toJson(patch.allergies))); sets.push(`allergies = $${params.length}`); }
  if (patch.pastHistory !== undefined) { params.push(db.json(toJson(patch.pastHistory))); sets.push(`past_history = $${params.length}`); }
  if (patch.tags !== undefined) { params.push(db.json(toJson(patch.tags))); sets.push(`tags = $${params.length}`); }
  if (sets.length === 0) return getPatientById(id, sql);

  params.push(id);
  const rows = await db.unsafe(
    `UPDATE clinical.patients SET ${sets.join(', ')} WHERE id = $${params.length} AND deleted_at IS NULL RETURNING ${SELECT_COLS}`,
    params,
  );
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function countPatients(sql?: Sql): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`SELECT COUNT(*)::int AS cnt FROM clinical.patients WHERE deleted_at IS NULL`;
  return Number(rows[0]?.cnt ?? 0);
}
