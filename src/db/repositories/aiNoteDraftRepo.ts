import { getDb } from '../pool.js';

export interface AiNoteDraft {
  id: string; visitId: string; draftType: string; promptContext: string;
  generatedContent: string; modelVersion: string | null;
  status: 'draft'|'accepted'|'rejected'|'modified';
  reviewedBy: string | null; reviewedAt: string | null; doctorEdit: string | null;
  createdAt: string;
}

export async function create(input: {
  visitId: string; draftType: string; promptContext: string;
  generatedContent: string; modelVersion?: string;
}): Promise<AiNoteDraft> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.ai_note_drafts (visit_id, draft_type, prompt_context, generated_content, model_version)
    VALUES (${input.visitId}, ${input.draftType}, ${input.promptContext}, ${input.generatedContent}, ${input.modelVersion ?? 'jlmedaios-local-v1'})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<AiNoteDraft[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.ai_note_drafts WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

export async function review(id: string, doctorId: string, status: string, doctorEdit?: string): Promise<AiNoteDraft | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.ai_note_drafts SET status=${status}, reviewed_by=${doctorId}, reviewed_at=now(),
      doctor_edit=${doctorEdit ?? null}
    WHERE id=${id} AND status='draft' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): AiNoteDraft {
  return {
    id: r.id as string, visitId: r.visit_id as string, draftType: r.draft_type as string,
    promptContext: r.prompt_context as string, generatedContent: r.generated_content as string,
    modelVersion: r.model_version as string | null, status: r.status as 'draft'|'accepted'|'rejected'|'modified',
    reviewedBy: r.reviewed_by as string | null, reviewedAt: r.reviewed_at as string | null,
    doctorEdit: r.doctor_edit as string | null, createdAt: r.created_at as string,
  };
}
