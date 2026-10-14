/**
 * 健澜科技 jlmedaios - 质控整改闭环看板 Repository（215）
 *
 * clinical.qc_rectification 读写。
 * issue → 整改任务 → 复核关闭：新建一条 open 整改任务，按状态机前推一步，
 * 进入 closed 终态时写入 closed_at。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/** 状态机：open 待整改 → fixed 已整改待复核 → reviewed 复核通过 → closed 关闭 */
export type QcRectificationStatus = 'open' | 'fixed' | 'reviewed' | 'closed';

export interface QcRectification {
  id: string;
  issueId: string | null;
  assigneeId: string | null;
  status: QcRectificationStatus;
  note: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface NewQcRectification {
  issueId?: string | null;
  assigneeId?: string | null;
  note?: string | null;
}

/** 状态流转时的字段更新：新状态 + 可选备注 + 是否进入终态 */
export interface TransitionPatch {
  status: QcRectificationStatus;
  note?: string | null;
  closedAt?: string | null;
}

const COLS = `id, issue_id, assignee_id, status, note, created_at, closed_at`;

function map(row: Record<string, unknown>): QcRectification {
  return {
    id: String(row.id),
    issueId: row.issue_id ? String(row.issue_id) : null,
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    status: row.status as QcRectificationStatus,
    note: row.note != null ? String(row.note) : null,
    createdAt: String(row.created_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

/** 新建一条整改任务（初始状态 open）。 */
export async function createRectification(
  input: NewQcRectification, db?: DbExecutor,
): Promise<QcRectification> {
  const exec = db ?? getDb();
  const rows = await exec`
    INSERT INTO clinical.qc_rectification (issue_id, assignee_id, note, status)
    VALUES (${input.issueId ?? null}, ${input.assigneeId ?? null},
      ${input.note ?? null}, 'open')
    RETURNING ${exec.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

/** 看板全量列表（时间倒序，前端按 status 分列）。 */
export async function listRectifications(db?: DbExecutor): Promise<QcRectification[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(COLS)} FROM clinical.qc_rectification
    ORDER BY created_at DESC LIMIT 500`;
  return (rows as Record<string, unknown>[]).map(map);
}

/** 按 id 取一条（不存在返回 null）。 */
export async function getRectificationById(
  id: string, db?: DbExecutor,
): Promise<QcRectification | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(COLS)} FROM clinical.qc_rectification WHERE id = ${id}`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? map(row) : null;
}

/** 状态前推一步：更新 status / 可选 note / closed_at，返回更新后记录。 */
export async function transitionRectification(
  id: string, patch: TransitionPatch, db?: DbExecutor,
): Promise<QcRectification> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.qc_rectification
    SET status = ${patch.status},
        note = COALESCE(${patch.note ?? null}, note),
        closed_at = COALESCE(${patch.closedAt ?? null}, closed_at)
    WHERE id = ${id}
    RETURNING ${exec.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}
