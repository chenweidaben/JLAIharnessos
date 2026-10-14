import { getDb } from '../pool.js';

export interface NursingRecord {
  id: string; visitId: string; recordType: string;
  temperature: number | null; pulse: number | null; respiration: number | null;
  bpSystolic: number | null; bpDiastolic: number | null; oxygenSaturation: number | null;
  intakeMl: number | null; outputMl: number | null;
  content: string | null; recordedBy: string; recordedAt: string;
}

export async function create(input: {
  visitId: string; recordType: string;
  temperature?: number; pulse?: number; respiration?: number;
  bpSystolic?: number; bpDiastolic?: number; oxygenSaturation?: number;
  intakeMl?: number; outputMl?: number; content?: string; recordedBy: string;
}): Promise<NursingRecord> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.nursing_records
      (visit_id, record_type, temperature, pulse, respiration,
       blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation,
       intake_ml, output_ml, content, recorded_by)
    VALUES (${input.visitId}, ${input.recordType}, ${input.temperature ?? null}, ${input.pulse ?? null},
      ${input.respiration ?? null}, ${input.bpSystolic ?? null}, ${input.bpDiastolic ?? null},
      ${input.oxygenSaturation ?? null}, ${input.intakeMl ?? null}, ${input.outputMl ?? null},
      ${input.content ?? null}, ${input.recordedBy})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string, limit = 100): Promise<NursingRecord[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.nursing_records WHERE visit_id=${visitId}
    ORDER BY recorded_at DESC LIMIT ${limit}
  `;
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): NursingRecord {
  return {
    id: r.id as string, visitId: r.visit_id as string, recordType: r.record_type as string,
    temperature: r.temperature as number | null, pulse: r.pulse as number | null,
    respiration: r.respiration as number | null,
    bpSystolic: r.blood_pressure_systolic as number | null,
    bpDiastolic: r.blood_pressure_diastolic as number | null,
    oxygenSaturation: r.oxygen_saturation as number | null,
    intakeMl: r.intake_ml as number | null, outputMl: r.output_ml as number | null,
    content: r.content as string | null, recordedBy: r.recorded_by as string,
    recordedAt: r.recorded_at as string,
  };
}
