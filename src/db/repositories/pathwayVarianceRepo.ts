/**
 * 健澜科技 jlmedaios - 临床路径变异管理 Repository（213）
 *
 * clinical.pathway_variance 读写：就诊级变异原因/类型登记、按就诊列表、
 * 变异率分子（发生变异的 distinct 就诊数）与分母（入径总例数）取数。
 *
 * 并发与一致性：
 *  - 登记表以 insert-only 追加，不做状态机 CAS；
 *  - uuid 列动态过滤使用条件片段数组，避免空字符串绑定触发 22P02。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

// ---------------------------------------------------------------------------
// 变异登记
// ---------------------------------------------------------------------------

export interface PathwayVariance {
  id: string;
  pathwayId: string | null;
  visitId: string;
  reason: string;
  varianceType: string;
  recordedAt: string;
}

const VAR_COLS = `
  id, pathway_id, visit_id, reason, variance_type, recorded_at
`;

function mapVariance(row: Record<string, unknown>): PathwayVariance {
  return {
    id: String(row.id),
    pathwayId: row.pathway_id ? String(row.pathway_id) : null,
    visitId: String(row.visit_id),
    reason: String(row.reason),
    varianceType: String(row.variance_type),
    recordedAt: String(row.recorded_at),
  };
}

export interface CreateVarianceInput {
  visitId: string;
  reason: string;
  varianceType: string;
  pathwayId?: string | null;
}

export async function createVariance(
  input: CreateVarianceInput, tx: DbExecutor,
): Promise<PathwayVariance> {
  const rows = await tx`
    INSERT INTO clinical.pathway_variance
      (pathway_id, visit_id, reason, variance_type)
    VALUES (${input.pathwayId ?? null}, ${input.visitId}, ${input.reason}, ${input.varianceType})
    RETURNING ${tx.unsafe(VAR_COLS)}`;
  return mapVariance(rows[0] as Record<string, unknown>);
}

export async function listVariances(
  filter: { visitId?: string } = {},
  sql?: DbExecutor,
): Promise<PathwayVariance[]> {
  const db = sql ?? getDb();
  type Fragment = ReturnType<DbExecutor>;
  const conds: Fragment[] = [db`TRUE`];
  if (filter.visitId) conds.push(db`visit_id = ${filter.visitId}`);
  const where = conds.reduce((acc, c) => db`${acc} AND ${c}`);
  const rows = await db`
    SELECT ${db.unsafe(VAR_COLS)} FROM clinical.pathway_variance
    WHERE ${where}
    ORDER BY recorded_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapVariance);
}

// ---------------------------------------------------------------------------
// 变异率取数（分子/分母，纯计算在聚合器 varianceRate）
// ---------------------------------------------------------------------------

/** 发生过变异的 distinct 就诊数（变异率分子）。 */
export async function countVariedVisits(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT COUNT(DISTINCT visit_id)::int AS c FROM clinical.pathway_variance`;
  return Number((rows[0] as Record<string, unknown>).c) || 0;
}

/** 指定就诊是否已发生变异（该就诊变异率分子 0/1）。 */
export async function hasVarianceForVisit(visitId: string, sql?: DbExecutor): Promise<boolean> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT 1 AS hit FROM clinical.pathway_variance WHERE visit_id = ${visitId} LIMIT 1`;
  return rows.length > 0;
}

/** 入径总例数（变异率分母：pathway_enrollments 全量）。 */
export async function countEnrollments(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT COUNT(*)::int AS c FROM clinical.pathway_enrollments`;
  return Number((rows[0] as Record<string, unknown>).c) || 0;
}

/** 指定就诊的入径例数（按就诊查看时的变异率分母）。 */
export async function countEnrollmentsByVisit(visitId: string, sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT COUNT(*)::int AS c FROM clinical.pathway_enrollments WHERE visit_id = ${visitId}`;
  return Number((rows[0] as Record<string, unknown>).c) || 0;
}
