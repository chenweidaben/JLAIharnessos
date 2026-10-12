/**
 * 健澜科技 jlmedaios - PACU 记录 repo（M31-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface PacuRecord {
  id: string; visitId: string;
  activity: number; respiration: number; circulation: number; consciousness: number; spo2: number;
  enteredAt: string; exitedAt: string | null; delayedRecovery: boolean;
  dischargeDestination: string | null; note: string | null; createdBy: string; createdAt: string;
}
const COLS = `id, visit_id, activity, respiration, circulation, consciousness, spo2, entered_at, exited_at, delayed_recovery, discharge_destination, note, created_by, created_at`;

function map(r: Record<string, unknown>): PacuRecord {
  return {
    id: String(r.id), visitId: String(r.visit_id),
    activity: Number(r.activity), respiration: Number(r.respiration), circulation: Number(r.circulation),
    consciousness: Number(r.consciousness), spo2: Number(r.spo2),
    enteredAt: String(r.entered_at), exitedAt: r.exited_at ? String(r.exited_at) : null,
    delayedRecovery: Boolean(r.delayed_recovery),
    dischargeDestination: r.discharge_destination ? String(r.discharge_destination) : null,
    note: r.note ? String(r.note) : null,
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function create(
  input: { visitId: string; activity: number; respiration: number; circulation: number; consciousness: number; spo2: number; note?: string | null; createdBy: string },
  tx: DbExecutor = getDb(),
): Promise<PacuRecord> {
  const rows = await tx`
    INSERT INTO clinical.pacu_records
      (visit_id, activity, respiration, circulation, consciousness, spo2, note, created_by)
    VALUES (${input.visitId}, ${input.activity}, ${input.respiration}, ${input.circulation}, ${input.consciousness}, ${input.spo2}, ${input.note ?? null}, ${input.createdBy})
    RETURNING ${tx.unsafe(COLS)}
  `;
  return map(rows[0]);
}

export async function discharge(
  id: string, destination: string, tx: DbExecutor = getDb(),
): Promise<PacuRecord | null> {
  const rows = await tx`
    UPDATE clinical.pacu_records SET exited_at=now(), discharge_destination=${destination}
    WHERE id=${id} AND exited_at IS NULL
    RETURNING ${tx.unsafe(COLS)}`;
  return rows.length > 0 ? map(rows[0]) : null;
}

export async function listByVisit(visitId: string): Promise<PacuRecord[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.pacu_records
    WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(map);
}
