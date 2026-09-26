/**
 * 健澜科技 jlmedaios - 急诊留观 Repository（M1-B1）
 *
 * clinical.observations 表访问：
 *  - startObservation 开始留观：取留观号、留观床、护理等级、预计转归；
 *  - updateObservation 更新状态/生命体征/输液状态/待办；
 *  - endObservation 结束留观：入院或离院。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ============================== 类型 ============================== */

export type ObsStatus = 'observing' | 'stable' | 'worsening' | 'discharged' | 'admitted';

export interface ObsTask {
  id: string;
  content: string;
  done: boolean;
  dueTime?: string;
}

export interface Observation {
  id: string;
  obsNo: string;
  visitId: string;
  patientId: string;
  bedNo: string | null;
  startTime: string;
  endTime: string | null;
  diagnosis: string | null;
  nursingLevel: string;
  vitals: Record<string, unknown>;
  ivStatus: string | null;
  pendingTasks: ObsTask[];
  status: ObsStatus;
  expectedOutcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartObsInput {
  visitId: string;
  patientId: string;
  bedNo?: string | null;
  diagnosis?: string | null;
  nursingLevel?: string;
  startTime?: string;
  vitals?: Record<string, unknown>;
  ivStatus?: string;
  pendingTasks?: ObsTask[];
  expectedOutcome?: string | null;
}

/* ============================= 映射 ============================== */

function mapRow(row: Record<string, unknown>): Observation {
  return {
    id: String(row.id),
    obsNo: String(row.obs_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    bedNo: row.bed_no ? String(row.bed_no) : null,
    startTime: String(row.start_time),
    endTime: row.end_time ? String(row.end_time) : null,
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    nursingLevel: String(row.nursing_level),
    vitals: (row.vitals as Record<string, unknown>) ?? {},
    ivStatus: row.iv_status ? String(row.iv_status) : null,
    pendingTasks: (row.pending_tasks as ObsTask[]) ?? [],
    status: String(row.status) as ObsStatus,
    expectedOutcome: row.expected_outcome ? String(row.expected_outcome) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ============================ 开始 ============================== */

export async function startObservation(input: StartObsInput, executor?: DbExecutor): Promise<Observation> {
  return withExecutor(executor, async (sql) => {
    const dup = await sql`
      SELECT id FROM clinical.observations
      WHERE visit_id = ${input.visitId} AND status IN ('observing','stable','worsening')
    `;
    if (dup.length) throw new ObsConflictError('该患者已有进行中的留观记录');

    const seqRows = await sql`SELECT nextval('clinical.emergency_triage_no_seq')::bigint AS seq`;
    const obsNo = `OB${String(seqRows[0].seq)}`;
    const start = input.startTime ?? new Date().toISOString();

    const rows = await sql`
      INSERT INTO clinical.observations (
        obs_no, visit_id, patient_id, bed_no, start_time, diagnosis,
        nursing_level, vitals, iv_status, pending_tasks, status, expected_outcome
      ) VALUES (
        ${obsNo}, ${input.visitId}, ${input.patientId},
        ${input.bedNo ?? null}, ${start}, ${input.diagnosis ?? null},
        ${input.nursingLevel ?? 'level2'}, ${(input.vitals ?? {}) as never},
        ${input.ivStatus ?? null}, ${(input.pendingTasks ?? []) as never},
        'observing', ${input.expectedOutcome ?? null}
      )
      RETURNING *
    `;
    return mapRow(rows[0]);
  });
}

/* ============================ 更新 ============================== */

export async function updateObservation(
  obsId: string,
  data: {
    status?: ObsStatus;
    vitals?: Record<string, unknown>;
    ivStatus?: string;
    pendingTasks?: ObsTask[];
    nursingLevel?: string;
  },
  executor?: DbExecutor,
): Promise<Observation> {
  return withExecutor(executor, async (sql) => {
    const sets: string[] = [];
    if (data.status) sets.push(`status = '${data.status}'`);
    if (data.vitals) sets.push(`vitals = ${quoteJson(data.vitals)}`);
    if (data.ivStatus != null) sets.push(`iv_status = '${data.ivStatus}'`);
    if (data.pendingTasks) sets.push(`pending_tasks = ${quoteJson(data.pendingTasks)}`);
    if (data.nursingLevel) sets.push(`nursing_level = '${data.nursingLevel}'`);
    if (!sets.length) throw new ObsValidationError('没有需要更新的字段');

    const rows = await sql`
      UPDATE clinical.observations
      SET ${sql.unsafe(sets.join(', '))}
      WHERE id = ${obsId} AND status IN ('observing','stable','worsening')
      RETURNING *
    `;
    if (!rows.length) throw new ObsConflictError('留观记录不存在或已结束');
    return mapRow(rows[0]);
  });
}

/* ============================ 结束 ============================== */

export async function endObservation(
  obsId: string,
  data: { status: 'discharged' | 'admitted'; endTime?: string },
  executor?: DbExecutor,
): Promise<Observation> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      UPDATE clinical.observations SET
        status = ${data.status},
        end_time = ${data.endTime ?? new Date().toISOString()}
      WHERE id = ${obsId} AND status IN ('observing','stable','worsening')
      RETURNING *
    `;
    if (!rows.length) throw new ObsConflictError('留观记录不存在或已结束');
    return mapRow(rows[0]);
  });
}

/* ============================ 查询 ============================== */

export async function getObservationById(id: string, executor?: DbExecutor): Promise<Observation | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`SELECT * FROM clinical.observations WHERE id = ${id}`;
    return rows.length ? mapRow(rows[0]) : null;
  });
}

export async function getActiveObsByVisit(visitId: string, executor?: DbExecutor): Promise<Observation | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      SELECT * FROM clinical.observations
      WHERE visit_id = ${visitId} AND status IN ('observing','stable','worsening')
      ORDER BY start_time DESC LIMIT 1
    `;
    return rows.length ? mapRow(rows[0]) : null;
  });
}

export async function listObservations(
  filter: { status?: ObsStatus; activeOnly?: boolean } = {},
  executor?: DbExecutor,
): Promise<Observation[]> {
  return withExecutor(executor, async (sql) => {
    let rows: Record<string, unknown>[];
    if (filter.activeOnly) {
      rows = await sql`SELECT * FROM clinical.observations WHERE status IN ('observing','stable','worsening') ORDER BY start_time`;
    } else if (filter.status) {
      rows = await sql`SELECT * FROM clinical.observations WHERE status = ${filter.status} ORDER BY start_time`;
    } else {
      rows = await sql`SELECT * FROM clinical.observations ORDER BY start_time`;
    }
    return rows.map(mapRow);
  });
}

/* =========================== 错误 ============================== */

export class ObsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ObsConflictError';
  }
}

export class ObsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ObsValidationError';
  }
}

async function withExecutor<T>(executor: DbExecutor | undefined, fn: (sql: DbExecutor) => Promise<T>): Promise<T> {
  return executor ? fn(executor) : fn(getDb());
}

function quoteJson(v: unknown): string {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}
