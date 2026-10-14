import { getDb } from '../pool.js';

export interface SurgeryRecord {
  id: string; visitId: string; surgeryName: string; surgeryDate: string;
  surgeon: string; assistant1: string | null; assistant2: string | null; anesthesiologist: string | null;
  incisionType: string | null; diagnosisBefore: string | null; diagnosisAfter: string | null;
  procedureDetail: string | null; bloodLoss: number | null; bloodTransfusion: number | null;
  complications: string | null; status: 'draft'|'completed'|'signed';
  signedBy: string | null; signedAt: string | null;
}

export async function create(input: {
  visitId: string; surgeryName: string; surgeryDate: string; surgeon: string;
  assistant1?: string; assistant2?: string; anesthesiologist?: string;
  incisionType?: string; diagnosisBefore?: string; diagnosisAfter?: string;
  procedureDetail?: string; bloodLoss?: number; bloodTransfusion?: number; complications?: string;
}): Promise<SurgeryRecord> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.surgery_records
      (visit_id, surgery_name, surgery_date, surgeon, assistant1, assistant2, anesthesiologist,
       incision_type, diagnosis_before, diagnosis_after, procedure_detail, blood_loss, blood_transfusion, complications)
    VALUES (${input.visitId}, ${input.surgeryName}, ${input.surgeryDate}, ${input.surgeon},
      ${input.assistant1 ?? null}, ${input.assistant2 ?? null}, ${input.anesthesiologist ?? null},
      ${input.incisionType ?? null}, ${input.diagnosisBefore ?? null}, ${input.diagnosisAfter ?? null},
      ${input.procedureDetail ?? null}, ${input.bloodLoss ?? null}, ${input.bloodTransfusion ?? null},
      ${input.complications ?? null})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<SurgeryRecord[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.surgery_records WHERE visit_id=${visitId} ORDER BY surgery_date DESC`;
  return rows.map(mapRow);
}

export async function complete(id: string): Promise<SurgeryRecord | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.surgery_records SET status='completed', updated_at=now()
    WHERE id=${id} AND status='draft' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function sign(id: string, doctorId: string): Promise<SurgeryRecord | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.surgery_records SET status='signed', signed_by=${doctorId}, signed_at=now(), updated_at=now()
    WHERE id=${id} AND status='completed' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): SurgeryRecord {
  return {
    id: r.id as string, visitId: r.visit_id as string, surgeryName: r.surgery_name as string,
    surgeryDate: r.surgery_date as string, surgeon: r.surgeon as string,
    assistant1: r.assistant1 as string | null, assistant2: r.assistant2 as string | null,
    anesthesiologist: r.anesthesiologist as string | null, incisionType: r.incision_type as string | null,
    diagnosisBefore: r.diagnosis_before as string | null, diagnosisAfter: r.diagnosis_after as string | null,
    procedureDetail: r.procedure_detail as string | null, bloodLoss: r.blood_loss as number | null,
    bloodTransfusion: r.blood_transfusion as number | null, complications: r.complications as string | null,
    status: r.status as 'draft'|'completed'|'signed', signedBy: r.signed_by as string | null,
    signedAt: r.signed_at as string | null,
  };
}
