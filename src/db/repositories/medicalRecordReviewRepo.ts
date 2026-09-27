/**
 * 健澜科技数智医院智能体 - 病历质控记录 Repository（M2-B）
 *
 * clinical.medical_record_reviews 表写入/查询。
 * 每次质控（通过/退回）均落库留痕，形成三级质控签名责任链。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type ReviewDecision = 'pass' | 'return';

export interface RecordReview {
  id: string;
  recordId: string;
  reviewLevel: number;
  decision: ReviewDecision;
  reviewerId: string;
  comment: string | null;
  issues: Array<Record<string, unknown>>;
  ruleIssueCount: number;
  aiIssueCount: number;
  aiAssisted: boolean;
  aiModel: string | null;
  createdAt: string;
}

export interface ReviewCreateInput {
  recordId: string;
  reviewLevel: number;
  decision: ReviewDecision;
  reviewerId: string;
  comment?: string | null;
  issues: Array<Record<string, unknown>>;
  ruleIssueCount: number;
  aiIssueCount: number;
  aiAssisted: boolean;
  aiModel?: string | null;
}

const SELECT_COLS = `id, record_id, review_level, decision, reviewer_id, comment, issues,
  rule_issue_count, ai_issue_count, ai_assisted, ai_model, created_at`;

function mapRow(row: Record<string, unknown>): RecordReview {
  return {
    id: String(row.id),
    recordId: String(row.record_id),
    reviewLevel: Number(row.review_level),
    decision: row.decision as ReviewDecision,
    reviewerId: String(row.reviewer_id),
    comment: row.comment ? String(row.comment) : null,
    issues: (row.issues as Array<Record<string, unknown>>) ?? [],
    ruleIssueCount: Number(row.rule_issue_count),
    aiIssueCount: Number(row.ai_issue_count),
    aiAssisted: Boolean(row.ai_assisted),
    aiModel: row.ai_model ? String(row.ai_model) : null,
    createdAt: String(row.created_at),
  };
}

/** 写入一条质控记录，可在事务内（与病历状态更新同提交）。 */
export async function insertReview(input: ReviewCreateInput, sql?: DbExecutor): Promise<RecordReview> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.medical_record_reviews (
      record_id, review_level, decision, reviewer_id, comment, issues,
      rule_issue_count, ai_issue_count, ai_assisted, ai_model
    ) VALUES (
      ${input.recordId}, ${input.reviewLevel}, ${input.decision}, ${input.reviewerId},
      ${input.comment ?? null}, ${db.json(toJson(input.issues))},
      ${input.ruleIssueCount}, ${input.aiIssueCount}, ${input.aiAssisted}, ${input.aiModel ?? null}
    )
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

/** 按病历列全部质控记录（时间正序，便于还原签名链）。 */
export async function listReviewsByRecord(recordId: string, sql?: DbExecutor): Promise<RecordReview[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.medical_record_reviews
    WHERE record_id = ${recordId} ORDER BY created_at ASC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}