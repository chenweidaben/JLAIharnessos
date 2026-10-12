/**
 * 健澜科技 jlmedaios - 不良事件后结构化评估 Repository（M17-D）
 *
 * clinical.nursing_event_reviews 读写（一事件一份，UNIQUE(event_id)）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { RiskLevel } from '../../medical-tools/nursing/eventReview.js';

export interface EventReview {
  id: string;
  eventId: string;
  visitId: string;
  occurredAt: string;
  location: string | null;
  circumstances: string | null;
  injuries: string | null;
  witness: boolean | null;
  firstAid: string | null;
  familyNotified: boolean | null;
  riskRescoreLevel: RiskLevel | null;
  followUpPlan: string | null;
  reviewedBy: string;
  createdAt: string;
}

const COLS = `id, event_id, visit_id, occurred_at, location, circumstances, injuries, witness,
  first_aid, family_notified, risk_rescore_level, follow_up_plan, reviewed_by, created_at`;

function map(row: Record<string, unknown>): EventReview {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    visitId: String(row.visit_id),
    occurredAt: String(row.occurred_at),
    location: row.location ? String(row.location) : null,
    circumstances: row.circumstances ? String(row.circumstances) : null,
    injuries: row.injuries ? String(row.injuries) : null,
    witness: row.witness === null ? null : row.witness === true,
    firstAid: row.first_aid ? String(row.first_aid) : null,
    familyNotified: row.family_notified === null ? null : row.family_notified === true,
    riskRescoreLevel: (row.risk_rescore_level as RiskLevel | null) ?? null,
    followUpPlan: row.follow_up_plan ? String(row.follow_up_plan) : null,
    reviewedBy: String(row.reviewed_by),
    createdAt: String(row.created_at),
  };
}

export interface NewReview {
  eventId: string;
  visitId: string;
  occurredAt: string;
  location?: string | null;
  circumstances?: string | null;
  injuries?: string | null;
  witness?: boolean | null;
  firstAid?: string | null;
  familyNotified?: boolean | null;
  riskRescoreLevel?: RiskLevel | null;
  followUpPlan?: string | null;
  reviewedBy: string;
}

/** 插入评估；事件已有评估则 UNIQUE(event_id) 冲突，调用方捕获 -> 409。 */
export async function insertReview(input: NewReview, tx: DbExecutor): Promise<EventReview> {
  const rows = await tx`
    INSERT INTO clinical.nursing_event_reviews
      (event_id, visit_id, occurred_at, location, circumstances, injuries, witness,
       first_aid, family_notified, risk_rescore_level, follow_up_plan, reviewed_by)
    VALUES (${input.eventId}, ${input.visitId}, ${input.occurredAt}, ${input.location ?? null},
      ${input.circumstances ?? null}, ${input.injuries ?? null}, ${input.witness ?? null},
      ${input.firstAid ?? null}, ${input.familyNotified ?? null}, ${input.riskRescoreLevel ?? null},
      ${input.followUpPlan ?? null}, ${input.reviewedBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function getReviewByEventId(eventId: string, sql?: DbExecutor): Promise<EventReview | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.nursing_event_reviews WHERE event_id = ${eventId}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 按就诊列评估；visit_id 为 uuid，TS 条件拼接。 */
export async function listReviews(visitId?: string, sql?: DbExecutor): Promise<EventReview[]> {
  const db = sql ?? getDb();
  let rows;
  if (visitId) {
    rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.nursing_event_reviews WHERE visit_id = ${visitId} ORDER BY occurred_at DESC`;
  } else {
    rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.nursing_event_reviews ORDER BY occurred_at DESC`;
  }
  return (rows as Record<string, unknown>[]).map(map);
}

/** 在院就诊数（NQI 分母，与 getRiskMetrics 一致口径）。 */
export async function countInpatientVisits(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`SELECT count(*)::int AS n FROM clinical.visits WHERE visit_type = 'inpatient'`;
  return Number((rows[0] as Record<string, unknown>).n);
}
