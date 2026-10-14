import { getDb } from '../pool.js';

export interface PathwayRec {
  id: string; visitId: string; diagnosis: string; pathwayName: string; pathwayCode: string | null;
  steps: Array<{day: number; action: string; responsible: string}>;
  expectedDays: number | null; confidence: number | null;
  status: 'pending'|'accepted'|'rejected'; acceptedAt: string | null;
}

export async function create(input: {
  visitId: string; diagnosis: string; pathwayName: string; pathwayCode?: string;
  steps: Array<{day: number; action: string; responsible: string}>;
  expectedDays: number; confidence: number;
}): Promise<PathwayRec> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.pathway_recommendations (visit_id, diagnosis, pathway_name, pathway_code, steps, expected_days, confidence)
    VALUES (${input.visitId}, ${input.diagnosis}, ${input.pathwayName}, ${input.pathwayCode ?? null},
      ${JSON.stringify(input.steps)}::jsonb, ${input.expectedDays}, ${input.confidence})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function listByVisit(visitId: string): Promise<PathwayRec[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.pathway_recommendations WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(mapRow);
}

export async function accept(id: string): Promise<PathwayRec | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.pathway_recommendations SET status='accepted', accepted_at=now()
    WHERE id=${id} AND status='pending' RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): PathwayRec {
  return {
    id: r.id as string, visitId: r.visit_id as string, diagnosis: r.diagnosis as string,
    pathwayName: r.pathway_name as string, pathwayCode: r.pathway_code as string | null,
    steps: (r.steps as Array<{day: number; action: string; responsible: string}>) ?? [],
    expectedDays: r.expected_days as number | null, confidence: r.confidence as number | null,
    status: r.status as 'pending'|'accepted'|'rejected', acceptedAt: r.accepted_at as string | null,
  };
}
