/**
 * 健澜科技 jlmedaios - 整改效果回看 repo（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface ReviewRow {
  id: string; taskId: string; cohortWindowDays: number;
  baselineVisits: number; baselineOverspendRate: string;
  followupVisits: number; followupOverspendRate: string; followupReadmitRate: string;
  verdict: string; evaluatedAt: string | null; createdAt: string;
}

function map(r: Record<string, unknown>): ReviewRow {
  return {
    id: String(r.id), taskId: String(r.task_id), cohortWindowDays: Number(r.cohort_window_days),
    baselineVisits: Number(r.baseline_visits), baselineOverspendRate: String(r.baseline_overspend_rate),
    followupVisits: Number(r.followup_visits), followupOverspendRate: String(r.followup_overspend_rate),
    followupReadmitRate: String(r.followup_readmit_rate),
    verdict: String(r.verdict), evaluatedAt: r.evaluated_at == null ? null : String(r.evaluated_at),
    createdAt: String(r.created_at),
  };
}

export async function upsertReview(
  input: { taskId: string; cohortWindowDays?: number; baselineVisits: number; baselineOverspendRate: number; followupVisits: number; followupOverspendRate: number; followupReadmitRate: number; verdict: string },
  tx: DbExecutor = db,
): Promise<ReviewRow> {
  const rows = await tx`
    INSERT INTO clinical.improvement_outcome_reviews
      (task_id, cohort_window_days, baseline_visits, baseline_overspend_rate, followup_visits, followup_overspend_rate, followup_readmit_rate, verdict, evaluated_at)
    VALUES (${input.taskId}, ${input.cohortWindowDays ?? 90}, ${input.baselineVisits}, ${input.baselineOverspendRate}, ${input.followupVisits}, ${input.followupOverspendRate}, ${input.followupReadmitRate}, ${input.verdict}, now())
    ON CONFLICT (task_id) DO UPDATE SET
      baseline_visits=EXCLUDED.baseline_visits, baseline_overspend_rate=EXCLUDED.baseline_overspend_rate,
      followup_visits=EXCLUDED.followup_visits, followup_overspend_rate=EXCLUDED.followup_overspend_rate,
      followup_readmit_rate=EXCLUDED.followup_readmit_rate, verdict=EXCLUDED.verdict, evaluated_at=now()
    RETURNING id, task_id, cohort_window_days, baseline_visits, baseline_overspend_rate, followup_visits, followup_overspend_rate, followup_readmit_rate, verdict, evaluated_at, created_at`;
  return map(rows[0] as Record<string, unknown>);
}

export async function getByTask(taskId: string, tx: DbExecutor = db): Promise<ReviewRow | null> {
  const rows = await tx`
    SELECT id, task_id, cohort_window_days, baseline_visits, baseline_overspend_rate, followup_visits, followup_overspend_rate, followup_readmit_rate, verdict, evaluated_at, created_at
    FROM clinical.improvement_outcome_reviews WHERE task_id=${taskId}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function listByVerdict(verdict: string): Promise<ReviewRow[]> {
  const rows = await db`
    SELECT id, task_id, cohort_window_days, baseline_visits, baseline_overspend_rate, followup_visits, followup_overspend_rate, followup_readmit_rate, verdict, evaluated_at, created_at
    FROM clinical.improvement_outcome_reviews WHERE verdict=${verdict} ORDER BY evaluated_at DESC NULLS LAST LIMIT 200`;
  return rows.map((r) => map(r as Record<string, unknown>));
}
