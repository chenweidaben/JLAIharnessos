/**
 * 健澜科技 jlmedaios - 处方点评 Repository
 *
 * clinical.prescription_review 表读写：
 *  - 待点评处方：clinical.prescriptions 中 status='pending_review' 且尚无点评记录的处方；
 *  - 点评记录：INSERT 一条结论（合理 / 不合理 / 超常）；
 *  - 历史与统计：点评记录列表与按结论分组计数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../pool.js';

/** 点评结论：合理 / 不合理 / 超常 */
export type ReviewResult = 'rational' | 'irrational' | 'abnormal';

/** 一条点评记录 */
export interface PrescriptionReview {
  id: string;
  prescriptionId: string;
  reviewerId: string | null;
  result: ReviewResult;
  comment: string | null;
  reviewedAt: string;
}

/** 待点评处方（头表摘要，供药师逐条点评） */
export interface PendingPrescription {
  prescriptionId: string;
  rxNo: string;
  visitId: string;
  prescriberId: string | null;
  riskLevel: string | null;
  createdAt: string;
}

/** 新增一条点评记录 */
export async function create(input: {
  prescriptionId: string;
  reviewerId: string;
  result: ReviewResult;
  comment?: string | null;
}): Promise<PrescriptionReview> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.prescription_review (prescription_id, reviewer_id, result, comment)
    VALUES (${input.prescriptionId}, ${input.reviewerId}, ${input.result}, ${input.comment ?? null})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

/** 待点评处方列表：已提交待审且尚未点评的处方 */
export async function listPending(limit = 50): Promise<PendingPrescription[]> {
  const db = getDb();
  const rows = await db`
    SELECT p.id AS prescription_id, p.rx_no, p.visit_id, p.prescriber_id, p.risk_level, p.created_at
    FROM clinical.prescriptions p
    WHERE p.status = 'pending_review'
      AND NOT EXISTS (
        SELECT 1 FROM clinical.prescription_review r WHERE r.prescription_id = p.id
      )
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r: Record<string, unknown>) => ({
    prescriptionId: String(r.prescription_id),
    rxNo: String(r.rx_no),
    visitId: String(r.visit_id),
    prescriberId: r.prescriber_id ? String(r.prescriber_id) : null,
    riskLevel: r.risk_level ? String(r.risk_level) : null,
    createdAt: String(r.created_at),
  }));
}

/** 全部点评记录（供统计与最近点评列表），默认按点评时间倒序 */
export async function listAll(limit = 200): Promise<PrescriptionReview[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.prescription_review
    ORDER BY reviewed_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): PrescriptionReview {
  return {
    id: String(r.id),
    prescriptionId: String(r.prescription_id),
    reviewerId: r.reviewer_id ? String(r.reviewer_id) : null,
    result: r.result as ReviewResult,
    comment: r.comment != null ? String(r.comment) : null,
    reviewedAt: String(r.reviewed_at),
  };
}
