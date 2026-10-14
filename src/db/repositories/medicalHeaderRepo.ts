import { getDb } from '../pool.js';

export interface MedicalHeader {
  id: string; visitId: string; patientName: string; gender: string | null; birthDate: string | null;
  idCard: string | null; admissionDate: string; dischargeDate: string | null;
  deptName: string | null; wardName: string | null; attendingDoctor: string | null;
  primaryDiagnosis: string | null; secondaryDiagnoses: string[];
  operationCodes: string[]; operationNames: string[]; icd10Codes: string[];
  totalCost: number | null; insuranceType: string | null; dischargeStatus: string | null;
  status: 'draft'|'completed'|'verified'; verifiedBy: string | null; verifiedAt: string | null;
}

export async function upsert(input: {
  visitId: string; patientName: string; admissionDate: string;
  gender?: string; birthDate?: string; idCard?: string; dischargeDate?: string;
  deptName?: string; wardName?: string; attendingDoctor?: string;
  primaryDiagnosis?: string; secondaryDiagnoses?: string[];
  operationCodes?: string[]; operationNames?: string[]; icd10Codes?: string[];
  totalCost?: number; insuranceType?: string; dischargeStatus?: string;
}): Promise<MedicalHeader> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.medical_record_headers
      (visit_id, patient_name, admission_date, gender, birth_date, id_card, discharge_date,
       dept_name, ward_name, attending_doctor, primary_diagnosis, secondary_diagnoses,
       operation_codes, operation_names, icd10_codes, total_cost, insurance_type, discharge_status)
    VALUES (${input.visitId}, ${input.patientName}, ${input.admissionDate}, ${input.gender ?? null},
      ${input.birthDate ?? null}, ${input.idCard ?? null}, ${input.dischargeDate ?? null},
      ${input.deptName ?? null}, ${input.wardName ?? null}, ${input.attendingDoctor ?? null},
      ${input.primaryDiagnosis ?? null}, ${input.secondaryDiagnoses ?? null},
      ${input.operationCodes ?? null}, ${input.operationNames ?? null}, ${input.icd10Codes ?? null},
      ${input.totalCost ?? null}, ${input.insuranceType ?? null}, ${input.dischargeStatus ?? null})
    ON CONFLICT (visit_id) DO UPDATE SET
      patient_name=EXCLUDED.patient_name, admission_date=EXCLUDED.admission_date,
      gender=EXCLUDED.gender, birth_date=EXCLUDED.birth_date, id_card=EXCLUDED.id_card,
      discharge_date=EXCLUDED.discharge_date, dept_name=EXCLUDED.dept_name,
      ward_name=EXCLUDED.ward_name, attending_doctor=EXCLUDED.attending_doctor,
      primary_diagnosis=EXCLUDED.primary_diagnosis, secondary_diagnoses=EXCLUDED.secondary_diagnoses,
      operation_codes=EXCLUDED.operation_codes, operation_names=EXCLUDED.operation_names,
      icd10_codes=EXCLUDED.icd10_codes, total_cost=EXCLUDED.total_cost,
      insurance_type=EXCLUDED.insurance_type, discharge_status=EXCLUDED.discharge_status,
      updated_at=now()
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function getByVisit(visitId: string): Promise<MedicalHeader | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.medical_record_headers WHERE visit_id=${visitId}`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function listByDept(dept: string, limit = 50): Promise<MedicalHeader[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.medical_record_headers WHERE dept_name=${dept}
    ORDER BY admission_date DESC LIMIT ${limit}
  `;
  return rows.map(mapRow);
}

export async function verify(id: string, doctorId: string): Promise<MedicalHeader | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.medical_record_headers SET status='verified', verified_by=${doctorId}, verified_at=now(), updated_at=now()
    WHERE id=${id} AND status='completed' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): MedicalHeader {
  return {
    id: r.id as string, visitId: r.visit_id as string, patientName: r.patient_name as string,
    gender: r.gender as string | null, birthDate: r.birth_date as string | null,
    idCard: r.id_card as string | null, admissionDate: r.admission_date as string,
    dischargeDate: r.discharge_date as string | null, deptName: r.dept_name as string | null,
    wardName: r.ward_name as string | null, attendingDoctor: r.attending_doctor as string | null,
    primaryDiagnosis: r.primary_diagnosis as string | null,
    secondaryDiagnoses: (r.secondary_diagnoses as string[]) ?? [],
    operationCodes: (r.operation_codes as string[]) ?? [],
    operationNames: (r.operation_names as string[]) ?? [],
    icd10Codes: (r.icd10_codes as string[]) ?? [],
    totalCost: r.total_cost as number | null, insuranceType: r.insurance_type as string | null,
    dischargeStatus: r.discharge_status as string | null, status: r.status as 'draft'|'completed'|'verified',
    verifiedBy: r.verified_by as string | null, verifiedAt: r.verified_at as string | null,
  };
}
