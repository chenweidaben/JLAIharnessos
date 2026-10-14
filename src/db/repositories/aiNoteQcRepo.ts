/**
 * 健澜科技 jlmedaios - AI病历质控记录仓库（M90-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

export interface AiNoteQcIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface AiNoteQcRecord {
  id: string;
  visitId: string;
  noteType: string | null;
  issues: AiNoteQcIssue[];
  score: number | null;
  status: string;
  createdAt: string;
}

export async function create(input: {
  visitId: string; noteType?: string; issues: AiNoteQcIssue[];
  score: number; status?: string;
}): Promise<AiNoteQcRecord> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.ai_note_qc (visit_id, note_type, issues, score, status)
    VALUES (${input.visitId}, ${input.noteType ?? 'emr_qc'}, ${JSON.stringify(input.issues)}::jsonb,
      ${input.score}, ${input.status ?? 'pending'})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function getById(id: string): Promise<AiNoteQcRecord | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.ai_note_qc WHERE id=${id} LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function listLatestByVisit(visitId: string, limit = 10): Promise<AiNoteQcRecord[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.ai_note_qc
    WHERE visit_id=${visitId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): AiNoteQcRecord {
  return {
    id: r.id as string, visitId: r.visit_id as string,
    noteType: r.note_type as string | null,
    issues: (r.issues as AiNoteQcIssue[]) ?? [],
    score: r.score == null ? null : Number(r.score),
    status: r.status as string,
    createdAt: r.created_at as string,
  };
}
