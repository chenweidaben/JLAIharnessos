import { getDb } from '../pool.js';

export interface MedReview {
  id: string; visitId: string; orderId: string | null; drugName: string;
  reviewType: string; severity: 'info'|'warning'|'critical';
  message: string; suggestion: string | null;
  status: 'open'|'acknowledged'|'overridden';
  reviewedBy: string | null; reviewedAt: string | null; overrideReason: string | null;
  createdAt: string;
}

export async function create(input: {
  visitId: string; orderId?: string; drugName: string; reviewType: string;
  severity: string; message: string; suggestion?: string;
}): Promise<MedReview> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.medication_reviews (visit_id, order_id, drug_name, review_type, severity, message, suggestion)
    VALUES (${input.visitId}, ${input.orderId ?? null}, ${input.drugName}, ${input.reviewType},
      ${input.severity}, ${input.message}, ${input.suggestion ?? null})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listOpenByVisit(visitId: string): Promise<MedReview[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.medication_reviews WHERE visit_id=${visitId} AND status='open'
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC
  `;
  return rows.map(mapRow);
}

export async function override(id: string, doctorId: string, reason: string): Promise<MedReview | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.medication_reviews SET status='overridden', reviewed_by=${doctorId},
      reviewed_at=now(), override_reason=${reason}
    WHERE id=${id} AND status='open' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): MedReview {
  return {
    id: r.id as string, visitId: r.visit_id as string, orderId: r.order_id as string | null,
    drugName: r.drug_name as string, reviewType: r.review_type as string,
    severity: r.severity as 'info'|'warning'|'critical', message: r.message as string,
    suggestion: r.suggestion as string | null, status: r.status as 'open'|'acknowledged'|'overridden',
    reviewedBy: r.reviewed_by as string | null, reviewedAt: r.reviewed_at as string | null,
    overrideReason: r.override_reason as string | null, createdAt: r.created_at as string,
  };
}
