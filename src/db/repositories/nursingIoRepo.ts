/**
 * 健澜科技 jlmedaios - 护理出入量 Repository（M17-E）
 *
 * clinical.nursing_io_records 读写。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { IoDirection } from '../../medical-tools/nursing/ioBalance.js';

export type IoCategory =
  | 'oral' | 'tube_feed' | 'iv' | 'blood_product'
  | 'urine' | 'stool' | 'drain' | 'vomit' | 'sweat' | 'other';

export interface IoRecord {
  id: string;
  visitId: string;
  patientId: string;
  direction: IoDirection;
  category: IoCategory;
  amountMl: number;
  recordTime: string;
  note: string | null;
  recordedBy: string;
}

const COLS = `id, visit_id, patient_id, direction, category, amount_ml, record_time, note, recorded_by`;

function map(row: Record<string, unknown>): IoRecord {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    direction: row.direction as IoDirection,
    category: row.category as IoCategory,
    amountMl: Number(row.amount_ml),
    recordTime: String(row.record_time),
    note: row.note ? String(row.note) : null,
    recordedBy: String(row.recorded_by),
  };
}

export interface NewIoRecord {
  visitId: string;
  patientId: string;
  direction: IoDirection;
  category: IoCategory;
  amountMl: number;
  recordTime?: string;
  note?: string | null;
  recordedBy: string;
}

export async function insertIoRecord(input: NewIoRecord, tx: DbExecutor): Promise<IoRecord> {
  const rows = await tx`
    INSERT INTO clinical.nursing_io_records
      (visit_id, patient_id, direction, category, amount_ml, record_time, note, recorded_by)
    VALUES (${input.visitId}, ${input.patientId}, ${input.direction}, ${input.category},
      ${input.amountMl}, ${input.recordTime ?? new Date().toISOString()}, ${input.note ?? null}, ${input.recordedBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

/** 按就诊列；visit_id 为 uuid，TS 条件拼接；可选时间窗。 */
export async function listIoRecords(
  filter: { visitId?: string; since?: string; until?: string } = {},
  sql?: DbExecutor,
): Promise<IoRecord[]> {
  const db = sql ?? getDb();
  const conds = [];
  if (filter.visitId) conds.push(db`visit_id = ${filter.visitId}`);
  if (filter.since) conds.push(db`record_time >= ${filter.since}`);
  if (filter.until) conds.push(db`record_time <= ${filter.until}`);
  let where = db``;
  if (conds.length > 0) {
    where = db`WHERE ${conds[0]}`;
    for (let i = 1; i < conds.length; i++) where = db`${where} AND ${conds[i]}`;
  }
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.nursing_io_records
    ${where} ORDER BY record_time DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}
