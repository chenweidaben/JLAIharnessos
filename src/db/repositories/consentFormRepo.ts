import { getDb } from '../pool.js';

export interface ConsentForm {
  id: string; visitId: string; consentType: string; title: string; content: string;
  patientSignature: string | null; patientSignedAt: string | null;
  witnessName: string | null; witnessSignature: string | null;
  doctorSignature: string | null; doctorSignedAt: string | null;
  status: 'pending'|'signed'|'witnessed';
}

export async function create(input: {
  visitId: string; consentType: string; title: string; content: string;
}): Promise<ConsentForm> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.consent_forms (visit_id, consent_type, title, content)
    VALUES (${input.visitId}, ${input.consentType}, ${input.title}, ${input.content})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<ConsentForm[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.consent_forms WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

export async function patientSign(id: string, signature: string, witnessName?: string): Promise<ConsentForm | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.consent_forms
    SET patient_signature=${signature}, patient_signed_at=now(),
        witness_name=${witnessName ?? null}, status='signed', updated_at=now()
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function doctorSign(id: string, doctorId: string): Promise<ConsentForm | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.consent_forms
    SET doctor_signature=${doctorId}, doctor_signed_at=now(), status='witnessed', updated_at=now()
    WHERE id=${id} AND status='signed' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): ConsentForm {
  return {
    id: r.id as string, visitId: r.visit_id as string, consentType: r.consent_type as string,
    title: r.title as string, content: r.content as string,
    patientSignature: r.patient_signature as string | null, patientSignedAt: r.patient_signed_at as string | null,
    witnessName: r.witness_name as string | null, witnessSignature: r.witness_signature as string | null,
    doctorSignature: r.doctor_signature as string | null, doctorSignedAt: r.doctor_signed_at as string | null,
    status: r.status as 'pending'|'signed'|'witnessed',
  };
}
