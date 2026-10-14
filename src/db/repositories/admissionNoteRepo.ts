import { getDb } from '../pool.js';

export interface AdmissionNote {
  id: string; visitId: string; chiefComplaint: string; presentIllness: string;
  pastHistory: string | null; personalHistory: string | null; familyHistory: string | null;
  physicalExam: string | null; auxiliaryExam: string | null; preliminaryDiagnosis: string;
  treatmentPlan: string | null; status: 'draft'|'submitted'|'verified';
}

export async function getByVisit(visitId: string): Promise<AdmissionNote | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.admission_notes WHERE visit_id=${visitId} LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsert(input: Record<string, unknown>): Promise<AdmissionNote> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.admission_notes
      (visit_id, chief_complaint, present_illness, past_history, personal_history, family_history,
       physical_exam, auxiliary_exam, preliminary_diagnosis, treatment_plan, attending_doctor)
    VALUES (${String(input.visitId)}, ${String(input.chiefComplaint)}, ${String(input.presentIllness)},
      ${input.pastHistory ? String(input.pastHistory) : null}, ${input.personalHistory ? String(input.personalHistory) : null},
      ${input.familyHistory ? String(input.familyHistory) : null}, ${input.physicalExam ? String(input.physicalExam) : null},
      ${input.auxiliaryExam ? String(input.auxiliaryExam) : null}, ${String(input.preliminaryDiagnosis)},
      ${input.treatmentPlan ? String(input.treatmentPlan) : null}, ${input.attendingDoctor ? String(input.attendingDoctor) : null})
    ON CONFLICT (visit_id) DO UPDATE SET
      chief_complaint=EXCLUDED.chief_complaint, present_illness=EXCLUDED.present_illness,
      past_history=EXCLUDED.past_history, personal_history=EXCLUDED.personal_history,
      family_history=EXCLUDED.family_history, physical_exam=EXCLUDED.physical_exam,
      auxiliary_exam=EXCLUDED.auxiliary_exam, preliminary_diagnosis=EXCLUDED.preliminary_diagnosis,
      treatment_plan=EXCLUDED.treatment_plan, updated_at=now()
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function submit(id: string): Promise<AdmissionNote | null> {
  const db = getDb();
  const rows = await db`UPDATE clinical.admission_notes SET status='submitted', updated_at=now() WHERE id=${id} AND status='draft' RETURNING *`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function verify(id: string): Promise<AdmissionNote | null> {
  const db = getDb();
  const rows = await db`UPDATE clinical.admission_notes SET status='verified', updated_at=now() WHERE id=${id} AND status='submitted' RETURNING *`;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): AdmissionNote {
  return {
    id: r.id as string, visitId: r.visit_id as string, chiefComplaint: r.chief_complaint as string,
    presentIllness: r.present_illness as string, pastHistory: r.past_history as string | null,
    personalHistory: r.personal_history as string | null, familyHistory: r.family_history as string | null,
    physicalExam: r.physical_exam as string | null, auxiliaryExam: r.auxiliary_exam as string | null,
    preliminaryDiagnosis: r.preliminary_diagnosis as string, treatmentPlan: r.treatment_plan as string | null,
    status: r.status as 'draft'|'submitted'|'verified',
  };
}
