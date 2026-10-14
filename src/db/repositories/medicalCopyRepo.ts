import { getDb } from '../pool.js';

export interface CopyRequest {
  id: string; visitId: string; applicantName: string; applicantRelation: string;
  idCardNo: string; contactPhone: string; purpose: string; copies: number;
  status: 'pending'|'approved'|'rejected'|'completed';
  reviewedAt: string | null; reviewedBy: string | null; rejectReason: string | null;
  completedAt: string | null;
}

export async function create(input: {
  visitId: string; applicantName: string; applicantRelation: string;
  idCardNo: string; contactPhone: string; purpose: string; copies: number;
}): Promise<CopyRequest> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.medical_record_copy_requests
      (visit_id, applicant_name, applicant_relation, id_card_no, contact_phone, purpose, copies)
    VALUES (${input.visitId}, ${input.applicantName}, ${input.applicantRelation},
      ${input.idCardNo}, ${input.contactPhone}, ${input.purpose}, ${input.copies})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function review(id: string, reviewerId: string, approve: boolean, reason?: string): Promise<CopyRequest | null> {
  const db = getDb();
  const status = approve ? 'approved' : 'rejected';
  const rows = await db`
    UPDATE clinical.medical_record_copy_requests
    SET status=${status}, reviewed_at=now(), reviewed_by=${reviewerId}, reject_reason=${reason ?? null}, updated_at=now()
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function complete(id: string): Promise<CopyRequest | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.medical_record_copy_requests
    SET status='completed', completed_at=now(), updated_at=now()
    WHERE id=${id} AND status='approved' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function listByStatus(status: string): Promise<CopyRequest[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.medical_record_copy_requests WHERE status=${status} ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): CopyRequest {
  return {
    id: r.id as string, visitId: r.visit_id as string, applicantName: r.applicant_name as string,
    applicantRelation: r.applicant_relation as string, idCardNo: r.id_card_no as string,
    contactPhone: r.contact_phone as string, purpose: r.purpose as string, copies: r.copies as number,
    status: r.status as 'pending'|'approved'|'rejected'|'completed',
    reviewedAt: r.reviewed_at as string | null, reviewedBy: r.reviewed_by as string | null,
    rejectReason: r.reject_reason as string | null, completedAt: r.completed_at as string | null,
  };
}
