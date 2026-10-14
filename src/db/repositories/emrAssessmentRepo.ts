import { getDb } from '../pool.js';

export interface EmrMetric {
  id: string; metricCode: string; metricName: string; category: string;
  targetValue: number; currentValue: number; unit: string | null;
  status: 'pending'|'pass'|'fail'; measuredAt: string | null;
}

export async function listAll(): Promise<EmrMetric[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.emr_assessment_metrics ORDER BY category, metric_code`;
  return rows.map(mapRow);
}

export async function updateValue(code: string, value: number): Promise<EmrMetric | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.emr_assessment_metrics
    SET current_value=${value}, measured_at=now(),
      status=CASE WHEN current_value >= target_value THEN 'pass' ELSE 'fail' END,
      updated_at=now()
    WHERE metric_code=${code} RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): EmrMetric {
  return {
    id: r.id as string, metricCode: r.metric_code as string, metricName: r.metric_name as string,
    category: r.category as string, targetValue: r.target_value as number,
    currentValue: r.current_value as number, unit: r.unit as string | null,
    status: r.status as 'pending'|'pass'|'fail', measuredAt: r.measured_at as string | null,
  };
}
