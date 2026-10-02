/**
 * 健澜科技数智医院智能体 - 科研专病队列 Repository（M5-B）
 *
 * clinical.research_cohorts / clinical.research_cohort_members 表 CRUD。
 * 成员写入幂等（ON CONFLICT 跳过），运行匹配可重复执行不重复入组。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder } from './helpers.js';
import type { CohortCriteria } from '../../medical-tools/research/cohortRuleEngine.js';

export interface ResearchCohort {
  id: string;
  name: string;
  disease: string;
  diseaseCode: string | null;
  criteria: CohortCriteria;
  status: 'draft' | 'active' | 'archived';
  createdBy: string | null;
  lastRunAt: string | null;
  lastRunAdded: number;
  createdAt: string;
  updatedAt: string;
}

export interface CohortMember {
  id: string;
  cohortId: string;
  patientId: string;
  matchedAt: string;
  matchedRules: string[];
  dataSnapshot: Record<string, unknown>;
}

export interface CohortCreateInput {
  name: string;
  disease: string;
  diseaseCode?: string | null;
  criteria: CohortCriteria;
  createdBy: string;
}

const COHORT_COLS = `
  id, name, disease, disease_code, criteria, status, created_by,
  last_run_at, last_run_added, created_at, updated_at
`;
const MEMBER_COLS = `id, cohort_id, patient_id, matched_at, matched_rules, data_snapshot`;

function parseJson<T>(v: unknown, fallback: T): T {
  if (v != null && typeof v === 'object') return v as T;
  if (typeof v === 'string' && v.trim()) {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapCohort(row: Record<string, unknown>): ResearchCohort {
  return {
    id: String(row.id),
    name: String(row.name),
    disease: String(row.disease),
    diseaseCode: row.disease_code ? String(row.disease_code) : null,
    criteria: parseJson<CohortCriteria>(row.criteria, { include: {}, exclude: {} }),
    status: row.status as ResearchCohort['status'],
    createdBy: row.created_by ? String(row.created_by) : null,
    lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
    lastRunAdded: Number(row.last_run_added ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMember(row: Record<string, unknown>): CohortMember {
  return {
    id: String(row.id),
    cohortId: String(row.cohort_id),
    patientId: String(row.patient_id),
    matchedAt: String(row.matched_at),
    matchedRules: parseJson<string[]>(row.matched_rules, []),
    dataSnapshot: parseJson<Record<string, unknown>>(row.data_snapshot, {}),
  };
}

export async function createCohort(
  input: CohortCreateInput,
  sql?: DbExecutor,
): Promise<ResearchCohort> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.research_cohorts
      (name, disease, disease_code, criteria, status, created_by)
    VALUES (
      ${input.name}, ${input.disease}, ${input.diseaseCode ?? null},
      ${db.json(JSON.stringify(input.criteria))}, 'draft', ${input.createdBy}
    )
    RETURNING ${db.unsafe(COHORT_COLS)}
  `;
  return mapCohort(rows[0] as Record<string, unknown>);
}

export async function getCohortById(id: string, sql?: DbExecutor): Promise<ResearchCohort | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COHORT_COLS)} FROM clinical.research_cohorts WHERE id = ${id}
  `;
  return rows.length > 0 ? mapCohort(rows[0] as Record<string, unknown>) : null;
}

export async function listCohorts(
  options?: { status?: string; limit?: number; offset?: number },
  sql?: Sql,
): Promise<ResearchCohort[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder();
  if (options?.status) qb.where('status = ?', options.status);
  return dynamicSelect<Record<string, unknown>>(
    db, COHORT_COLS, 'clinical.research_cohorts', qb, 'updated_at DESC',
    options?.limit ?? 50, options?.offset ?? 0,
  ).then((rows) => rows.map(mapCohort));
}

/** 更新标准（仅草稿态可改，由聚合器保证状态） */
export async function updateCohortDefinition(
  id: string,
  patch: { name?: string; criteria?: CohortCriteria; disease?: string; diseaseCode?: string | null },
  sql?: DbExecutor,
): Promise<ResearchCohort | null> {
  const db = sql ?? getDb();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.name !== undefined) { params.push(patch.name); sets.push(`name = $${params.length}`); }
  if (patch.disease !== undefined) { params.push(patch.disease); sets.push(`disease = $${params.length}`); }
  if (patch.diseaseCode !== undefined) { params.push(patch.diseaseCode); sets.push(`disease_code = $${params.length}`); }
  if (patch.criteria !== undefined) {
    params.push(JSON.stringify(patch.criteria));
    sets.push(`criteria = $${params.length}`);
  }
  if (sets.length === 0) return getCohortById(id, sql);
  params.push(id);
  const rows = await db.unsafe(
    `UPDATE clinical.research_cohorts SET ${sets.join(', ')}
     WHERE id = $${params.length} RETURNING ${COHORT_COLS}`,
    params,
  );
  return rows.length > 0 ? mapCohort(rows[0] as Record<string, unknown>) : null;
}

export async function setCohortStatus(
  id: string,
  status: ResearchCohort['status'],
  sql?: DbExecutor,
): Promise<ResearchCohort | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.research_cohorts SET status = ${status}
    WHERE id = ${id}
    RETURNING ${db.unsafe(COHORT_COLS)}
  `;
  return rows.length > 0 ? mapCohort(rows[0] as Record<string, unknown>) : null;
}

/** 记录最近一次运行结果（新增数、时间） */
export async function recordCohortRun(
  id: string,
  added: number,
  sql?: DbExecutor,
): Promise<void> {
  const db = sql ?? getDb();
  await db`
    UPDATE clinical.research_cohorts
    SET last_run_at = now(), last_run_added = ${added}
    WHERE id = ${id}
  `;
}

/** 添加成员（幂等：已在队列则跳过，返回是否新增） */
export async function addCohortMember(
  cohortId: string,
  patientId: string,
  matchedRules: string[],
  dataSnapshot: Record<string, unknown>,
  sql?: DbExecutor,
): Promise<boolean> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.research_cohort_members
      (cohort_id, patient_id, matched_rules, data_snapshot)
    VALUES (
      ${cohortId}, ${patientId},
      ${db.json(JSON.stringify(matchedRules))}, ${db.json(JSON.stringify(dataSnapshot))}
    )
    ON CONFLICT (cohort_id, patient_id) DO NOTHING
  `;
  return rows.count > 0;
}

export async function listCohortMembers(
  cohortId: string,
  options?: { limit?: number; offset?: number },
  sql?: Sql,
): Promise<CohortMember[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('cohort_id = ?', cohortId);
  return dynamicSelect<Record<string, unknown>>(
    db, MEMBER_COLS, 'clinical.research_cohort_members', qb, 'matched_at DESC',
    options?.limit ?? 100, options?.offset ?? 0,
  ).then((rows) => rows.map(mapMember));
}

export async function countCohortMembers(cohortId: string, sql?: Sql): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT COUNT(*)::int AS cnt FROM clinical.research_cohort_members WHERE cohort_id = ${cohortId}
  `;
  return Number(rows[0]?.cnt ?? 0);
}
