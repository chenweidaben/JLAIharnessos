import { getDb } from '../pool.js';

export interface ProgressNote {
  id: string; visitId: string; noteType: string; noteDate: string;
  content: string; attendingDoctor: string | null;
  status: 'draft'|'signed'; signedAt: string | null;
}

export async function create(input: {
  visitId: string; noteType: string; content: string; attendingDoctor: string; noteDate?: string;
}): Promise<ProgressNote> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.progress_notes (visit_id, note_type, note_date, content, attending_doctor)
    VALUES (${input.visitId}, ${input.noteType}, ${input.noteDate ?? new Date().toISOString()}, ${input.content}, ${input.attendingDoctor})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<ProgressNote[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.progress_notes WHERE visit_id=${visitId} ORDER BY note_date DESC`;
  return rows.map(mapRow);
}

export async function sign(id: string): Promise<ProgressNote | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.progress_notes SET status='signed', signed_at=now(), updated_at=now()
    WHERE id=${id} AND status='draft' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): ProgressNote {
  return {
    id: r.id as string, visitId: r.visit_id as string, noteType: r.note_type as string,
    noteDate: r.note_date as string, content: r.content as string,
    attendingDoctor: r.attending_doctor as string | null,
    status: r.status as 'draft'|'signed', signedAt: r.signed_at as string | null,
  };
}
