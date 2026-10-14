import { getDb } from '../pool.js';

export interface QcError { field: string; message: string; severity: 'major'|'minor'; }

export interface MedicalQc {
  id: string; visitId: string; qcType: string; checker: string; checkDate: string;
  score: number | null; errors: QcError[]; suggestions: string | null;
  status: 'pending'|'rectified'|'confirmed';
}

export async function create(input: {
  visitId: string; qcType: string; checker: string; score: number;
  errors: QcError[]; suggestions?: string;
}): Promise<MedicalQc> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.medical_qc_records (visit_id, qc_type, checker, score, errors, suggestions)
    VALUES (${input.visitId}, ${input.qcType}, ${input.checker}, ${input.score},
      ${JSON.stringify(input.errors)}::jsonb, ${input.suggestions ?? null})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<MedicalQc[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.medical_qc_records WHERE visit_id=${visitId} ORDER BY check_date DESC`;
  return rows.map(mapRow);
}

export async function rectify(id: string): Promise<MedicalQc | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.medical_qc_records SET status='rectified', updated_at=now()
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): MedicalQc {
  return {
    id: r.id as string, visitId: r.visit_id as string, qcType: r.qc_type as string,
    checker: r.checker as string, checkDate: r.check_date as string,
    score: r.score as number | null, errors: (r.errors as QcError[]) ?? [],
    suggestions: r.suggestions as string | null, status: r.status as 'pending'|'rectified'|'confirmed',
  };
}
