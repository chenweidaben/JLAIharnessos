import { getDb } from '../pool.js';

export interface LosPrediction {
  id: string; visitId: string; predictedLosDays: number; predictedCost: number;
  riskLevel: 'low'|'medium'|'high';
  factors: Array<{factor: string; impact: string}>;
  confidence: number | null; modelVersion: string | null; createdAt: string;
}

export async function create(input: {
  visitId: string; predictedLosDays: number; predictedCost: number;
  riskLevel: string; factors: Array<{factor: string; impact: string}>;
  confidence: number; modelVersion?: string;
}): Promise<LosPrediction> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.los_cost_predictions (visit_id, predicted_los_days, predicted_cost, risk_level, factors, confidence, model_version)
    VALUES (${input.visitId}, ${input.predictedLosDays}, ${input.predictedCost}, ${input.riskLevel},
      ${JSON.stringify(input.factors)}::jsonb, ${input.confidence}, ${input.modelVersion ?? 'jlmedaios-los-v1'})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function getLatestByVisit(visitId: string): Promise<LosPrediction | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.los_cost_predictions WHERE visit_id=${visitId} ORDER BY created_at DESC LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): LosPrediction {
  return {
    id: r.id as string, visitId: r.visit_id as string,
    predictedLosDays: Number(r.predicted_los_days), predictedCost: Number(r.predicted_cost),
    riskLevel: r.risk_level as 'low'|'medium'|'high',
    factors: (r.factors as Array<{factor: string; impact: string}>) ?? [],
    confidence: r.confidence as number | null, modelVersion: r.model_version as string | null,
    createdAt: r.created_at as string,
  };
}
