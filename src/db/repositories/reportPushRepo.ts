/**
 * 健澜科技 jlmedaios - 报告推送 Repository（M19-B）
 *
 * clinical.report_pushes。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export interface ReportPush {
  id: string;
  reportType: 'lab' | 'imaging';
  reportId: string;
  patientId: string;
  visitId: string | null;
  pushedAt: string;
  pushedBy: string;
  viewedAt: string | null;
  viewCount: number;
  status: 'pushed' | 'viewed';
}

const COLS = `id, report_type, report_id, patient_id, visit_id, pushed_at, pushed_by, viewed_at, view_count, status`;

function map(row: Record<string, unknown>): ReportPush {
  return {
    id: String(row.id),
    reportType: row.report_type as 'lab' | 'imaging',
    reportId: String(row.report_id),
    patientId: String(row.patient_id),
    visitId: row.visit_id ? String(row.visit_id) : null,
    pushedAt: String(row.pushed_at),
    pushedBy: String(row.pushed_by),
    viewedAt: row.viewed_at ? String(row.viewed_at) : null,
    viewCount: Number(row.view_count),
    status: row.status as 'pushed' | 'viewed',
  };
}

/** 推送（幂等 UNIQUE(report_type,report_id)）。 */
export async function pushReport(input: { reportType: 'lab' | 'imaging'; reportId: string; patientId: string; visitId?: string | null; pushedBy: string }, sql?: DbExecutor): Promise<ReportPush> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.report_pushes (report_type, report_id, patient_id, visit_id, pushed_by)
    VALUES (${input.reportType}, ${input.reportId}, ${input.patientId}, ${input.visitId ?? null}, ${input.pushedBy})
    ON CONFLICT (report_type, report_id) DO UPDATE SET pushed_at = clinical.report_pushes.pushed_at
    RETURNING ${db.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

/** 按患者列推送列表。 */
export async function listByPatient(patientId: string, sql?: DbExecutor): Promise<ReportPush[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.report_pushes WHERE patient_id = ${patientId} ORDER BY pushed_at DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}

export async function getById(id: string, sql?: DbExecutor): Promise<ReportPush | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.report_pushes WHERE id = ${id}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 标记已读：首次 viewed_at=now、status=viewed；再看 view_count+1。 */
export async function markViewed(id: string, tx: DbExecutor): Promise<ReportPush | null> {
  const rows = await tx`
    UPDATE clinical.report_pushes
    SET viewed_at = COALESCE(viewed_at, now()), status = 'viewed', view_count = view_count + 1
    WHERE id = ${id}
    RETURNING ${tx.unsafe(COLS)}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
