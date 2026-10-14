import { getDb } from '../pool.js';

export interface DischargeSummary {
  id: string;
  visitId: string;
  admissionDate: string;
  dischargeDate: string;
  dischargeType: string;
  dischargeDiagnoses: string;
  admissionDiagnoses: string;
  treatmentCourse: string;
  dischargeOrders: string;
  followupPlan: string | null;
  attendingDoctor: string | null;
  status: 'draft' | 'submitted' | 'verified';
  submittedAt: string | null;
  verifiedAt: string | null;
}

export async function getByVisit(visitId: string): Promise<DischargeSummary | null> {
  const db = getDb();
  const row = await db`
    SELECT * FROM clinical.discharge_summaries WHERE visit_id = ${visitId} LIMIT 1
  `;
  return row.length ? mapRow(row[0]) : null;
}

export async function upsert(input: {
  visitId: string; admissionDate: string; dischargeDate: string; dischargeType: string;
  dischargeDiagnoses: string; admissionDiagnoses: string; treatmentCourse: string;
  dischargeOrders: string; followupPlan?: string | null; attendingDoctor?: string | null;
}): Promise<DischargeSummary> {
  const db = getDb();
  const row = await db`
    INSERT INTO clinical.discharge_summaries
      (visit_id, admission_date, discharge_date, discharge_type, discharge_diagnoses,
       admission_diagnoses, treatment_course, discharge_orders, followup_plan, attending_doctor)
    VALUES (${input.visitId}, ${input.admissionDate}, ${input.dischargeDate}, ${input.dischargeType},
      ${input.dischargeDiagnoses}, ${input.admissionDiagnoses}, ${input.treatmentCourse},
      ${input.dischargeOrders}, ${input.followupPlan ?? null}, ${input.attendingDoctor ?? null})
    ON CONFLICT (visit_id) DO UPDATE SET
      admission_date = EXCLUDED.admission_date, discharge_date = EXCLUDED.discharge_date,
      discharge_type = EXCLUDED.discharge_type, discharge_diagnoses = EXCLUDED.discharge_diagnoses,
      admission_diagnoses = EXCLUDED.admission_diagnoses, treatment_course = EXCLUDED.treatment_course,
      discharge_orders = EXCLUDED.discharge_orders, followup_plan = EXCLUDED.followup_plan,
      attending_doctor = EXCLUDED.attending_doctor, updated_at = now()
    RETURNING *
  `;
  return mapRow(row[0]);
}

export async function submit(id: string): Promise<DischargeSummary | null> {
  const db = getDb();
  const row = await db`
    UPDATE clinical.discharge_summaries SET status='submitted', submitted_at=now(), updated_at=now()
    WHERE id=${id} AND status='draft' RETURNING *
  `;
  return row.length ? mapRow(row[0]) : null;
}

export async function verify(id: string): Promise<DischargeSummary | null> {
  const db = getDb();
  const row = await db`
    UPDATE clinical.discharge_summaries SET status='verified', verified_at=now(), updated_at=now()
    WHERE id=${id} AND status='submitted' RETURNING *
  `;
  return row.length ? mapRow(row[0]) : null;
}

function mapRow(r: Record<string, unknown>): DischargeSummary {
  return {
    id: r.id as string, visitId: r.visit_id as string, admissionDate: r.admission_date as string,
    dischargeDate: r.discharge_date as string, dischargeType: r.discharge_type as string,
    dischargeDiagnoses: r.discharge_diagnoses as string, admissionDiagnoses: r.admission_diagnoses as string,
    treatmentCourse: r.treatment_course as string, dischargeOrders: r.discharge_orders as string,
    followupPlan: r.followup_plan as string | null, attendingDoctor: r.attending_doctor as string | null,
    status: r.status as 'draft'|'submitted'|'verified', submittedAt: r.submitted_at as string | null,
    verifiedAt: r.verified_at as string | null,
  };
}
