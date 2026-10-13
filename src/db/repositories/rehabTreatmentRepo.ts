/**
 * 健澜科技 jlmedaios - 康复治疗执行记录 repo（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export type RehabModality = 'pt' | 'ot' | 'st' | 'physical' | 'cupping' | 'traction';
export type RehabStatus = 'prescribed' | 'signed' | 'completed' | 'missed' | 'cancelled';
export type RehabEfficacy = 'excellent' | 'good' | 'fair' | 'poor';

export interface RehabTreatment {
  id: string;
  visitId: string;
  modality: RehabModality;
  prescribedBy: string;
  scheduledDate: string;
  status: RehabStatus;
  executedAt: string | null;
  executedBy: string | null;
  efficacy: RehabEfficacy | null;
  note: string | null;
  createdAt: string;
}

const COLS = `id, visit_id, modality, prescribed_by, scheduled_date, status,
  executed_at, executed_by, efficacy, note, created_at`;

function map(r: Record<string, unknown>): RehabTreatment {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    modality: String(r.modality) as RehabModality,
    prescribedBy: String(r.prescribed_by),
    scheduledDate: String(r.scheduled_date),
    status: String(r.status) as RehabStatus,
    executedAt: r.executed_at ? String(r.executed_at) : null,
    executedBy: r.executed_by ? String(r.executed_by) : null,
    efficacy: r.efficacy ? String(r.efficacy) as RehabEfficacy : null,
    note: r.note ? String(r.note) : null,
    createdAt: String(r.created_at),
  };
}

/** 开单：prescribed。 */
export async function prescribeTreatment(
  input: { visitId: string; modality: RehabModality; prescribedBy: string; scheduledDate: string; note?: string | null },
  tx: DbExecutor = getDb(),
): Promise<RehabTreatment> {
  const rows = await tx`
    INSERT INTO clinical.rehab_treatments (visit_id, modality, prescribed_by, scheduled_date, note)
    VALUES (${input.visitId}, ${input.modality}, ${input.prescribedBy}, ${input.scheduledDate}, ${input.note ?? null})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

/** 行锁取单条。 */
export async function lockTreatment(id: string, tx: DbExecutor): Promise<RehabTreatment | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.rehab_treatments WHERE id=${id} FOR UPDATE`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 签到执行：prescribed → signed。 */
export async function signExecution(id: string, executedBy: string, tx: DbExecutor): Promise<RehabTreatment | null> {
  const rows = await tx`
    UPDATE clinical.rehab_treatments
    SET status='signed', executed_at=now(), executed_by=${executedBy}
    WHERE id=${id} AND status='prescribed'
    RETURNING ${tx.unsafe(COLS)}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 填疗效完成：signed → completed。 */
export async function completeWithEfficacy(
  id: string, efficacy: RehabEfficacy | null, note: string | null, tx: DbExecutor,
): Promise<RehabTreatment | null> {
  const rows = await tx`
    UPDATE clinical.rehab_treatments
    SET status='completed', efficacy=${efficacy ?? null}, note=COALESCE(${note}, note)
    WHERE id=${id} AND status='signed'
    RETURNING ${tx.unsafe(COLS)}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 按就诊列治疗单。 */
export async function listByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<RehabTreatment[]> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.rehab_treatments
    WHERE visit_id=${visitId} ORDER BY scheduled_date DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}
