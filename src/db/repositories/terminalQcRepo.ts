/**
 * 健澜科技 jlmedaios - 病历终末质控评分仓库（M90-B）
 *
 * 终末质控结果落库：一次扫描一行，含甲级/乙级/丙级判定、0-100 分与问题清单。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

export type TerminalGrade = '甲级' | '乙级' | '丙级';

export interface TerminalQcIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface TerminalQcRecord {
  id: string;
  visitId: string;
  grade: TerminalGrade | null;
  score: number | null;
  issues: TerminalQcIssue[];
  createdAt: string;
}

export async function create(input: {
  visitId: string; grade: TerminalGrade; issues: TerminalQcIssue[]; score: number;
}): Promise<TerminalQcRecord> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.terminal_qc (visit_id, grade, issues, score)
    VALUES (${input.visitId}, ${input.grade}, ${JSON.stringify(input.issues)}::jsonb, ${input.score})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function getById(id: string): Promise<TerminalQcRecord | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.terminal_qc WHERE id=${id} LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function listLatestByVisit(visitId: string, limit = 10): Promise<TerminalQcRecord[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.terminal_qc
    WHERE visit_id=${visitId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapRow);
}

/** 科室近 N 日终末质控记录（JOIN visits 过滤科室），供科主任驾驶舱甲级病历率 */
export interface DeptRecentQcRow {
  visitId: string;
  score: number | null;
  issues: TerminalQcIssue[];
  createdAt: string;
}

/**
 * 按科室取近 N 日终末质控评分（JOIN clinical.visits 过滤 dept）。
 * 只返回 score IS NOT NULL 的记录，按时间倒序限量；问题清单随记录带回用于预警。
 */
export async function listRecentByDept(
  dept: string, days = 30, limit = 200,
): Promise<DeptRecentQcRow[]> {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await db`
    SELECT t.visit_id, t.score, t.issues, t.created_at
    FROM clinical.terminal_qc t
    JOIN clinical.visits v ON v.id = t.visit_id
    WHERE v.department = ${dept}
      AND t.created_at >= ${since}
      AND t.score IS NOT NULL
    ORDER BY t.created_at DESC
    LIMIT ${limit}
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    visitId: String(r.visit_id),
    score: r.score == null ? null : Number(r.score),
    issues: (r.issues as TerminalQcIssue[]) ?? [],
    createdAt: String(r.created_at),
  }));
}

function mapRow(r: Record<string, unknown>): TerminalQcRecord {
  return {
    id: r.id as string,
    visitId: r.visit_id as string,
    grade: (r.grade as TerminalGrade | null) ?? null,
    issues: (r.issues as TerminalQcIssue[]) ?? [],
    score: r.score == null ? null : Number(r.score),
    createdAt: r.created_at as string,
  };
}
