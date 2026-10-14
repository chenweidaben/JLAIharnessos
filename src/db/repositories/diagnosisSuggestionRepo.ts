import { getDb } from '../pool.js';

export interface DiagnosisSuggestion {
  id: string; visitId: string; chiefComplaint: string; symptoms: string[];
  suggestions: Array<{diagnosis: string; confidence: number; icd10: string}>;
  confidence: number | null; status: 'pending'|'accepted'|'rejected';
  selectedDiagnosis: string | null; reviewedBy: string | null; reviewedAt: string | null;
}

export async function create(input: {
  visitId: string; chiefComplaint: string; symptoms: string[];
  suggestions: Array<{diagnosis: string; confidence: number; icd10: string}>;
  confidence: number;
}): Promise<DiagnosisSuggestion> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.diagnosis_suggestions (visit_id, chief_complaint, symptoms, suggestions, confidence)
    VALUES (${input.visitId}, ${input.chiefComplaint}, ${input.symptoms},
      ${JSON.stringify(input.suggestions)}::jsonb, ${input.confidence})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<DiagnosisSuggestion[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.diagnosis_suggestions WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

export async function review(id: string, doctorId: string, accepted: boolean, selectedDiagnosis?: string): Promise<DiagnosisSuggestion | null> {
  const db = getDb();
  const status = accepted ? 'accepted' : 'rejected';
  const rows = await db`
    UPDATE clinical.diagnosis_suggestions SET status=${status}, selected_diagnosis=${selectedDiagnosis ?? null},
      reviewed_by=${doctorId}, reviewed_at=now()
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): DiagnosisSuggestion {
  return {
    id: r.id as string, visitId: r.visit_id as string, chiefComplaint: r.chief_complaint as string,
    symptoms: (r.symptoms as string[]) ?? [],
    suggestions: (r.suggestions as Array<{diagnosis: string; confidence: number; icd10: string}>) ?? [],
    confidence: r.confidence as number | null, status: r.status as 'pending'|'accepted'|'rejected',
    selectedDiagnosis: r.selected_diagnosis as string | null, reviewedBy: r.reviewed_by as string | null,
    reviewedAt: r.reviewed_at as string | null,
  };
}
