import { getDb } from '../pool.js';

export interface Timeliness {
  id: string; visitId: string; docType: string; requiredMinutes: number;
  createdAt: string; dueAt: string; completedAt: string | null;
  status: 'pending'|'ontime'|'late'; lateMinutes: number | null;
}

export async function create(input: {
  visitId: string; docType: string; requiredMinutes: number; createdBy: string;
}): Promise<Timeliness> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.document_timeliness (visit_id, doc_type, required_minutes, created_by, due_at)
    VALUES (${input.visitId}, ${input.docType}, ${input.requiredMinutes}, ${input.createdBy},
      now() + (${input.requiredMinutes} || ' minutes')::interval)
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listPending(): Promise<Timeliness[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.document_timeliness
    WHERE status='pending' ORDER BY due_at ASC
  `;
  return rows.map(mapRow);
}

export async function complete(id: string): Promise<Timeliness | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.document_timeliness SET completed_at=now(),
      status=CASE WHEN now() <= due_at THEN 'ontime' ELSE 'late' END,
      late_minutes=CASE WHEN now() > due_at THEN EXTRACT(EPOCH FROM (now()-due_at))/60 ELSE 0 END
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function scanLate(): Promise<Timeliness[]> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.document_timeliness SET status='late',
      late_minutes=EXTRACT(EPOCH FROM (now()-due_at))/60
    WHERE status='pending' AND now() > due_at
    RETURNING *
  `;
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): Timeliness {
  return {
    id: r.id as string, visitId: r.visit_id as string, docType: r.doc_type as string,
    requiredMinutes: r.required_minutes as number, createdAt: r.created_at as string,
    dueAt: r.due_at as string, completedAt: r.completed_at as string | null,
    status: r.status as 'pending'|'ontime'|'late', lateMinutes: r.late_minutes as number | null,
  };
}
