/**
 * 健澜科技 jlmedaios - 床位 Repository（并发安全）
 *
 * clinical.beds 查询与原子分配/释放。床位状态：
 *   available 空闲 / occupied 占用 / maintenance 维护 / isolation 隔离。
 *
 * 并发安全（关键，保证“不重复分配”）：
 *  1) 自动分配：SELECT ... ORDER BY sort_order LIMIT 1 FOR UPDATE SKIP LOCKED，
 *     并发事务各自锁定并跳过被他人锁定的床，天然选到不同的床；
 *  2) 条件 UPDATE（CAS）：仅当 status='available' 时才置为 occupied，
 *     影响行数为 0 即该床已被他人占用 → 明确报错/回滚；
 *  3) 结构兜底：部分唯一索引 idx_beds_one_bed_per_patient 保证一位患者同时仅占一床。
 *
 * 注意：FOR UPDATE / SKIP LOCKED 必须在事务内调用，故分配/释放函数要求传入执行器（tx）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'isolation';
export type BedType = 'standard' | 'isolation' | 'icu' | 'resuscitation';

export interface Bed {
  id: string;
  wardId: string;
  bedNo: string;
  roomNo: string | null;
  bedType: BedType;
  status: BedStatus;
  currentVisitId: string | null;
  currentPatientId: string | null;
  occupiedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const BED_COLS = `
  id, ward_id, bed_no, room_no, bed_type, status, current_visit_id, current_patient_id,
  occupied_at, sort_order, created_at, updated_at
`;

function mapBed(row: Record<string, unknown>): Bed {
  return {
    id: String(row.id),
    wardId: String(row.ward_id),
    bedNo: String(row.bed_no),
    roomNo: row.room_no ? String(row.room_no) : null,
    bedType: row.bed_type as BedType,
    status: row.status as BedStatus,
    currentVisitId: row.current_visit_id ? String(row.current_visit_id) : null,
    currentPatientId: row.current_patient_id ? String(row.current_patient_id) : null,
    occupiedAt: row.occupied_at ? String(row.occupied_at) : null,
    sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ----------------------------- 错误类型 ------------------------------ */

export type BedAllocationFailure =
  | 'BED_NOT_FOUND'
  | 'BED_NOT_AVAILABLE'
  | 'NO_AVAILABLE_BED';

export class BedAllocationError extends Error {
  constructor(
    public failure: BedAllocationFailure,
    message: string,
  ) {
    super(message);
    this.name = 'BedAllocationError';
  }
}

/* ------------------------------- 查询 -------------------------------- */

export async function listBedsByWard(wardId: string, sql?: DbExecutor): Promise<Bed[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(BED_COLS)} FROM clinical.beds
    WHERE ward_id = ${wardId} ORDER BY sort_order, bed_no
  `;
  return (rows as Record<string, unknown>[]).map(mapBed);
}

export async function getBedById(id: string, sql?: DbExecutor): Promise<Bed | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(BED_COLS)} FROM clinical.beds WHERE id = ${id}`;
  return rows.length > 0 ? mapBed(rows[0] as Record<string, unknown>) : null;
}

export async function countBedsByStatus(
  wardId: string,
  sql?: DbExecutor,
): Promise<Record<BedStatus, number>> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT status, COUNT(*)::int AS cnt FROM clinical.beds
    WHERE ward_id = ${wardId} GROUP BY status
  `;
  const acc: Record<BedStatus, number> = {
    available: 0,
    occupied: 0,
    maintenance: 0,
    isolation: 0,
  };
  for (const r of rows as Record<string, unknown>[]) {
    acc[String(r.status) as BedStatus] = Number(r.cnt);
  }
  return acc;
}

/* ----------------------------- 原子分配 ------------------------------ */

/**
 * 分配床位（必须在事务内）。
 *
 * @param tx 事务执行器
 * @param input.bedId 指定床位（可选）；不传则在 wardId 内自动选一张空闲床
 * @param input.wardId 自动分配时的病区
 * @param input.visitId / patientId 占用者
 */
export async function allocateBed(
  tx: DbExecutor,
  input: { bedId?: string; wardId?: string; visitId: string; patientId: string },
): Promise<Bed> {
  let candidateId: string;

  if (input.bedId) {
    // 指定床位：先确认存在
    const bed = await getBedById(input.bedId, tx);
    if (!bed) {
      throw new BedAllocationError('BED_NOT_FOUND', `床位不存在: ${input.bedId}`);
    }
    candidateId = bed.id;
  } else {
    if (!input.wardId) {
      throw new BedAllocationError('NO_AVAILABLE_BED', '自动分配缺少病区参数');
    }
    // 自动选床：跳过已被其他事务锁定的床，每个并发事务选到不同的床
    const candidates = await tx`
      SELECT id FROM clinical.beds
      WHERE ward_id = ${input.wardId} AND status = 'available'
      ORDER BY sort_order, bed_no
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (candidates.length === 0) {
      throw new BedAllocationError(
        'NO_AVAILABLE_BED',
        '该病区已无可用空闲床位（含被并发事务锁定）',
      );
    }
    candidateId = String(candidates[0].id);
  }

  // CAS：仅当床仍空闲才占用（并发下若被他人抢先，影响 0 行）
  const rows = await tx`
    UPDATE clinical.beds SET
      status = 'occupied',
      current_visit_id = ${input.visitId},
      current_patient_id = ${input.patientId},
      occupied_at = now(),
      updated_at = now()
    WHERE id = ${candidateId} AND status = 'available'
    RETURNING ${tx.unsafe(BED_COLS)}
  `;
  if (rows.length === 0) {
    throw new BedAllocationError(
      'BED_NOT_AVAILABLE',
      '该床位已被占用或处于维护/隔离状态，请改选其他床位',
    );
  }
  return mapBed(rows[0] as Record<string, unknown>);
}

/* ----------------------------- 原子释放 ------------------------------ */

/**
 * 释放床位（必须在事务内）。仅当该床当前确实占用 visitId 时才释放，
 * 避免误释放他人/已调整的床位。
 */
export async function releaseBed(
  tx: DbExecutor,
  input: { bedId: string; visitId: string },
): Promise<Bed | null> {
  const rows = await tx`
    UPDATE clinical.beds SET
      status = 'available',
      current_visit_id = NULL,
      current_patient_id = NULL,
      occupied_at = NULL,
      updated_at = now()
    WHERE id = ${input.bedId} AND current_visit_id = ${input.visitId}
    RETURNING ${tx.unsafe(BED_COLS)}
  `;
  if (rows.length > 0) return mapBed(rows[0] as Record<string, unknown>);
  // 未匹配：床不存在或已不占用该 visit，返回当前状态供上层判断
  return getBedById(input.bedId, tx);
}

/* --------------------------- 床位状态维护 ----------------------------- */

/**
 * 设置床位状态（housekeeping：空闲/维护/隔离）。
 * 占用中的床位拒绝变更（必须先出院/换床）。
 */
export async function setBedStatus(
  tx: DbExecutor,
  input: { bedId: string; status: Extract<BedStatus, 'available' | 'maintenance' | 'isolation'> },
): Promise<Bed> {
  const rows = await tx`
    UPDATE clinical.beds SET status = ${input.status}, updated_at = now()
    WHERE id = ${input.bedId}
      AND status <> 'occupied' AND current_patient_id IS NULL
    RETURNING ${tx.unsafe(BED_COLS)}
  `;
  if (rows.length === 0) {
    const bed = await getBedById(input.bedId, tx);
    if (!bed) throw new BedAllocationError('BED_NOT_FOUND', `床位不存在: ${input.bedId}`);
    throw new BedAllocationError(
      'BED_NOT_AVAILABLE',
      '床位占用中，无法变更状态（请先出院或换床）',
    );
  }
  return mapBed(rows[0] as Record<string, unknown>);
}
