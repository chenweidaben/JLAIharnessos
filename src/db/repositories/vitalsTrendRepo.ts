import { getDb } from '../pool.js';

export interface VitalsPoint {
  recordedAt: string;
  temperature: number | null;
  pulse: number | null;
  respiration: number | null;
  sbp: number | null;
  dbp: number | null;
  spo2: number | null;
}

export async function listVitalsTrend(visitId: string): Promise<VitalsPoint[]> {
  const db = getDb();
  const rows = await db`
    SELECT recorded_at, vitals FROM clinical.nursing_records
    WHERE visit_id = ${visitId} AND status IN ('completed','signed')
    ORDER BY recorded_at ASC
  `;
  return rows.map((r: Record<string, unknown>) => {
    const v = (r.vitals ?? {}) as Record<string, unknown>;
    return {
      recordedAt: r.recorded_at as string,
      temperature: v.temperature != null ? Number(v.temperature) : null,
      pulse: v.pulse != null ? Number(v.pulse) : null,
      respiration: v.respiration != null ? Number(v.respiration) : null,
      sbp: v.sbp != null ? Number(v.sbp) : null,
      dbp: v.dbp != null ? Number(v.dbp) : null,
      spo2: v.spo2 != null ? Number(v.spo2) : null,
    };
  });
}

