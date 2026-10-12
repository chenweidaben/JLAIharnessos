/**
 * 健澜科技 jlmedaios - 急诊分诊五级 repo（M35-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Triage {
  id: string; visitId: string; level: string; chiefComplaint: string;
  heartRate: number | null; systolicBp: number | null; diastolicBp: number | null;
  respRate: number | null; spo2: number | null; temperatureC: number | null; gcs: number | null;
  greenChannel: boolean; triagedBy: string; createdAt: string;
}
const COLS = `id, visit_id, level, chief_complaint, heart_rate, systolic_bp, diastolic_bp, resp_rate, spo2, temperature_c, gcs, green_channel, triaged_by, created_at`;
function map(r: Record<string, unknown>): Triage {
  return {
    id: String(r.id), visitId: String(r.visit_id), level: String(r.level),
    chiefComplaint: String(r.chief_complaint),
    heartRate: r.heart_rate == null ? null : Number(r.heart_rate),
    systolicBp: r.systolic_bp == null ? null : Number(r.systolic_bp),
    diastolicBp: r.diastolic_bp == null ? null : Number(r.diastolic_bp),
    respRate: r.resp_rate == null ? null : Number(r.resp_rate),
    spo2: r.spo2 == null ? null : Number(r.spo2),
    temperatureC: r.temperature_c == null ? null : Number(r.temperature_c),
    gcs: r.gcs == null ? null : Number(r.gcs),
    greenChannel: Boolean(r.green_channel),
    triagedBy: String(r.triaged_by), createdAt: String(r.created_at),
  };
}

export async function upsertByVisit(
  inp: {
    visitId: string; level: string; chiefComplaint: string;
    heartRate?: number | null; systolicBp?: number | null; diastolicBp?: number | null;
    respRate?: number | null; spo2?: number | null; temperatureC?: number | null; gcs?: number | null;
    greenChannel: boolean; triagedBy: string;
  },
  tx: DbExecutor = getDb(),
): Promise<Triage> {
  const rows = await tx`
    INSERT INTO clinical.er_triage_levels
      (visit_id, level, chief_complaint, heart_rate, systolic_bp, diastolic_bp, resp_rate, spo2, temperature_c, gcs, green_channel, triaged_by)
    VALUES (${inp.visitId}, ${inp.level}, ${inp.chiefComplaint},
            ${inp.heartRate ?? null}, ${inp.systolicBp ?? null}, ${inp.diastolicBp ?? null},
            ${inp.respRate ?? null}, ${inp.spo2 ?? null}, ${inp.temperatureC ?? null}, ${inp.gcs ?? null},
            ${inp.greenChannel}, ${inp.triagedBy})
    ON CONFLICT (visit_id) DO UPDATE SET
      level=EXCLUDED.level, chief_complaint=EXCLUDED.chief_complaint,
      heart_rate=EXCLUDED.heart_rate, systolic_bp=EXCLUDED.systolic_bp, diastolic_bp=EXCLUDED.diastolic_bp,
      resp_rate=EXCLUDED.resp_rate, spo2=EXCLUDED.spo2, temperature_c=EXCLUDED.temperature_c, gcs=EXCLUDED.gcs,
      green_channel=EXCLUDED.green_channel, triaged_by=EXCLUDED.triaged_by
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0]);
}

export async function getByVisit(visitId: string): Promise<Triage | null> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.er_triage_levels WHERE visit_id=${visitId}`;
  return rows.length > 0 ? map(rows[0]) : null;
}
