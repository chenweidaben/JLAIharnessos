import { getDb } from '../pool.js';

export interface ConsultRequest {
  id: string; visitId: string; consultType: string; requestingDept: string;
  requestingDoctor: string; consultingDept: string; reason: string; clinicalInfo: string | null;
  status: 'pending'|'accepted'|'completed'|'cancelled';
  acceptedAt: string | null; acceptedBy: string | null; consultNote: string | null; completedAt: string | null;
}

export async function create(input: {
  visitId: string; consultType: string; requestingDept: string; requestingDoctor: string;
  consultingDept: string; reason: string; clinicalInfo?: string;
}): Promise<ConsultRequest> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.consult_requests
      (visit_id, consult_type, requesting_dept, requesting_doctor, consulting_dept, reason, clinical_info)
    VALUES (${input.visitId}, ${input.consultType}, ${input.requestingDept}, ${input.requestingDoctor},
      ${input.consultingDept}, ${input.reason}, ${input.clinicalInfo ?? null})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listPending(): Promise<ConsultRequest[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.consult_requests WHERE status='pending' ORDER BY created_at ASC`;
  return rows.map(mapRow);
}

export async function accept(id: string, doctorId: string): Promise<ConsultRequest | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.consult_requests SET status='accepted', accepted_at=now(), accepted_by=${doctorId}, updated_at=now()
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function complete(id: string, note: string): Promise<ConsultRequest | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.consult_requests SET status='completed', consult_note=${note}, completed_at=now(), updated_at=now()
    WHERE id=${id} AND status='accepted' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): ConsultRequest {
  return {
    id: r.id as string, visitId: r.visit_id as string, consultType: r.consult_type as string,
    requestingDept: r.requesting_dept as string, requestingDoctor: r.requesting_doctor as string,
    consultingDept: r.consulting_dept as string, reason: r.reason as string,
    clinicalInfo: r.clinical_info as string | null,
    status: r.status as 'pending'|'accepted'|'completed'|'cancelled',
    acceptedAt: r.accepted_at as string | null, acceptedBy: r.accepted_by as string | null,
    consultNote: r.consult_note as string | null, completedAt: r.completed_at as string | null,
  };
}
