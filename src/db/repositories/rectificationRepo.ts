/**
 * 健澜科技数智医院智能体 - 缺陷整改任务 Repository（M9-B）
 * quality.rectification_tasks 表读写。
 *
 * 终末质控"缺陷级"整改闭环：
 *  - createRectificationTask：质控确认缺陷后下发整改任务（幂等，同病历同缺陷只一条）；
 *  - listTasks：按责任医生 / 质控人 / 状态过滤；
 *  - getTaskForUpdate：FOR UPDATE 行锁，配合状态机做整改 / 复核；
 *  - applyRectify：责任医生提交整改（pending/in_progress → rectified）；
 *  - applyReview：质控复核，通过（rectified → reviewed）或驳回（→ pending）；
 *  - getRectificationStats：整改率、超时数等统计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ------------------------------ 类型 ------------------------------ */

export type RectificationStatus =
  | 'pending' // 待整改
  | 'in_progress' // 整改中
  | 'rectified' // 已整改（待复核）
  | 'reviewed'; // 已复核通过

export type RectificationDefectType =
  'integrity' | 'standardization' | 'logic' | 'timeliness';

export type RectificationDefectLevel = 'minor' | 'major' | 'critical';

export interface RectificationTask {
  id: string;
  recordId: string;
  visitId: string | null;
  defectRuleId: string;
  defectSection: string | null;
  defectMessage: string;
  defectType: RectificationDefectType;
  defectLevel: RectificationDefectLevel;
  deduction: number;
  assigneeId: string;
  createdById: string;
  status: RectificationStatus;
  rectifyContent: string | null;
  rectifyNote: string | null;
  rectifiedAt: string | null;
  reviewResult: 'approved' | 'rejected' | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRectificationInput {
  recordId: string;
  visitId?: string | null;
  defectRuleId: string;
  defectSection?: string | null;
  defectMessage: string;
  defectType: RectificationDefectType;
  defectLevel: RectificationDefectLevel;
  deduction?: number;
  assigneeId: string;
  createdById: string;
  deadline?: Date | null;
}

const TASK_COLS = `id, record_id, visit_id, defect_rule_id, defect_section, defect_message,
  defect_type, defect_level, deduction, assignee_id, created_by, status,
  rectify_content, rectify_note, rectified_at, review_result, review_note,
  reviewed_by, reviewed_at, deadline, created_at, updated_at`;

function mapTask(row: Record<string, unknown>): RectificationTask {
  return {
    id: String(row.id),
    recordId: String(row.record_id),
    visitId: row.visit_id != null ? String(row.visit_id) : null,
    defectRuleId: String(row.defect_rule_id),
    defectSection: row.defect_section != null ? String(row.defect_section) : null,
    defectMessage: String(row.defect_message),
    defectType: String(row.defect_type) as RectificationDefectType,
    defectLevel: String(row.defect_level) as RectificationDefectLevel,
    deduction: Number(row.deduction),
    assigneeId: String(row.assignee_id),
    createdById: String(row.created_by),
    status: String(row.status) as RectificationStatus,
    rectifyContent: row.rectify_content != null ? String(row.rectify_content) : null,
    rectifyNote: row.rectify_note != null ? String(row.rectify_note) : null,
    rectifiedAt: row.rectified_at != null ? String(row.rectified_at) : null,
    reviewResult:
      row.review_result === 'approved' ? 'approved'
      : row.review_result === 'rejected' ? 'rejected'
      : null,
    reviewNote: row.review_note != null ? String(row.review_note) : null,
    reviewedBy: row.reviewed_by != null ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at != null ? String(row.reviewed_at) : null,
    deadline: row.deadline != null ? String(row.deadline) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ------------------------------ 创建（幂等） ------------------------------ */

/**
 * 下发整改任务。唯一约束 (record_id, defect_rule_id) 保证幂等：
 * 已存在则回查既有任务，不重复创建。
 */
export async function createRectificationTask(
  input: CreateRectificationInput,
  sql?: DbExecutor,
): Promise<{ task: RectificationTask; created: boolean }> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO quality.rectification_tasks
      (record_id, visit_id, defect_rule_id, defect_section, defect_message,
       defect_type, defect_level, deduction, assignee_id, created_by, deadline)
    VALUES
      (${input.recordId}, ${input.visitId ?? null}, ${input.defectRuleId},
       ${input.defectSection ?? null}, ${input.defectMessage},
       ${input.defectType}, ${input.defectLevel}, ${input.deduction ?? 0},
       ${input.assigneeId}, ${input.createdById},
       ${input.deadline ?? null})
    ON CONFLICT (record_id, defect_rule_id) DO NOTHING
    RETURNING ${db.unsafe(TASK_COLS)}`;
  if (rows.length > 0) {
    return { task: mapTask(rows[0] as Record<string, unknown>), created: true };
  }
  // 已存在：回查
  const existing = await db`
    SELECT ${db.unsafe(TASK_COLS)} FROM quality.rectification_tasks
    WHERE record_id = ${input.recordId} AND defect_rule_id = ${input.defectRuleId}`;
  return { task: mapTask(existing[0] as Record<string, unknown>), created: false };
}

/* ------------------------------ 查询 ------------------------------ */

export async function getTaskById(
  id: string,
  sql?: DbExecutor,
): Promise<RectificationTask | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(TASK_COLS)} FROM quality.rectification_tasks
    WHERE id = ${id}`;
  return rows.length > 0 ? mapTask(rows[0] as Record<string, unknown>) : null;
}

/** FOR UPDATE 锁行（事务内），供状态机读取当前状态。 */
export async function getTaskForUpdate(
  id: string,
  tx: DbExecutor,
): Promise<RectificationTask | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(TASK_COLS)} FROM quality.rectification_tasks
    WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapTask(rows[0] as Record<string, unknown>) : null;
}

/* ------------------------ 带 join 的展示视图 ------------------------ */

/** 整改任务展示视图：在原始字段基础上 join 患者/就诊/责任医生/质控人。 */
export interface RectificationTaskView extends RectificationTask {
  mrn: string | null;
  patientName: string | null;
  visitNo: string | null;
  dept: string | null;
  assigneeName: string | null;
  createdByName: string | null;
}

const VIEW_SELECT = `
  t.id, t.record_id, t.visit_id, t.defect_rule_id, t.defect_section, t.defect_message,
  t.defect_type, t.defect_level, t.deduction, t.assignee_id, t.created_by, t.status,
  t.rectify_content, t.rectify_note, t.rectified_at, t.review_result, t.review_note,
  t.reviewed_by, t.reviewed_at, t.deadline, t.created_at, t.updated_at,
  p.mrn AS x_mrn, p.name_masked AS x_patient_name,
  v.visit_no AS x_visit_no, v.department AS x_dept,
  au.name AS x_assignee_name, cu.name AS x_created_by_name`;

function mapTaskView(row: Record<string, unknown>): RectificationTaskView {
  const base = mapTask(row);
  return {
    ...base,
    mrn: row.x_mrn != null ? String(row.x_mrn) : null,
    patientName: row.x_patient_name != null ? String(row.x_patient_name) : null,
    visitNo: row.x_visit_no != null ? String(row.x_visit_no) : null,
    dept: row.x_dept != null ? String(row.x_dept) : null,
    assigneeName: row.x_assignee_name != null ? String(row.x_assignee_name) : null,
    createdByName: row.x_created_by_name != null ? String(row.x_created_by_name) : null,
  };
}

export interface ListFilter {
  assigneeId?: string | null;
  createdById?: string | null;
  status?: RectificationStatus | null;
  overdue?: boolean;
}

/** 列表：可按责任医生 / 质控人 / 状态 / 超时过滤。 */
export async function listTasks(
  filter: ListFilter = {},
  sql?: DbExecutor,
): Promise<RectificationTask[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(TASK_COLS)} FROM quality.rectification_tasks
    WHERE 1 = 1
      ${filter.assigneeId ? db`AND assignee_id = ${filter.assigneeId}` : db``}
      ${filter.createdById ? db`AND created_by = ${filter.createdById}` : db``}
      ${filter.status ? db`AND status = ${filter.status}` : db``}
      ${filter.overdue ? db`AND deadline IS NOT NULL AND deadline < now()
        AND status NOT IN ('reviewed')` : db``}
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1
                  WHEN 'rectified' THEN 2 ELSE 3 END,
      created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapTask);
}

/** 展示视图列表（join），过滤条件同 ListFilter。 */
export async function listTasksView(
  filter: ListFilter = {},
  sql?: DbExecutor,
): Promise<RectificationTaskView[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(VIEW_SELECT)}
    FROM quality.rectification_tasks t
    LEFT JOIN clinical.visits v ON v.id = t.visit_id
    LEFT JOIN clinical.patients p ON p.id = v.patient_id
    LEFT JOIN iam.users au ON au.id = t.assignee_id
    LEFT JOIN iam.users cu ON cu.id = t.created_by
    WHERE 1 = 1
      ${filter.assigneeId ? db`AND t.assignee_id = ${filter.assigneeId}` : db``}
      ${filter.createdById ? db`AND t.created_by = ${filter.createdById}` : db``}
      ${filter.status ? db`AND t.status = ${filter.status}` : db``}
      ${filter.overdue ? db`AND t.deadline IS NOT NULL AND t.deadline < now()
        AND t.status NOT IN ('reviewed')` : db``}
    ORDER BY
      CASE t.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1
                    WHEN 'rectified' THEN 2 ELSE 3 END,
      t.created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapTaskView);
}

/** 展示视图详情（join）。 */
export async function getTaskViewById(
  id: string,
  sql?: DbExecutor,
): Promise<RectificationTaskView | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(VIEW_SELECT)}
    FROM quality.rectification_tasks t
    LEFT JOIN clinical.visits v ON v.id = t.visit_id
    LEFT JOIN clinical.patients p ON p.id = v.patient_id
    LEFT JOIN iam.users au ON au.id = t.assignee_id
    LEFT JOIN iam.users cu ON cu.id = t.created_by
    WHERE t.id = ${id}`;
  return rows.length > 0 ? mapTaskView(rows[0] as Record<string, unknown>) : null;
}

/* ------------------------------ 状态机写操作 ------------------------------ */

/**
 * 责任医生提交整改。
 * 仅当任务处于 pending / in_progress 且操作者为 assignee 时成功。
 * 调用方须先 getTaskForUpdate 锁行并校验，本函数只做条件 UPDATE。
 */
export async function applyRectify(
  id: string,
  content: string,
  note: string | null,
  tx: DbExecutor,
): Promise<number> {
  const rows = await tx`
    UPDATE quality.rectification_tasks
      SET status = 'rectified',
          rectify_content = ${content},
          rectify_note = ${note},
          rectified_at = now(),
          updated_at = now()
    WHERE id = ${id}
      AND status IN ('pending', 'in_progress')`;
  // assignee 校验在聚合器锁行后完成（getTaskForUpdate）
  return (rows as unknown as { count: number }).count;
}

/**
 * 质控复核：
 *  approved：rectified → reviewed，记录复核人与时间；
 *  rejected：rectified → pending（退回重新整改），保留复核痕迹。
 */
export async function applyReview(
  id: string,
  result: 'approved' | 'rejected',
  note: string | null,
  reviewerId: string,
  tx: DbExecutor,
): Promise<number> {
  const rows = await tx`
    UPDATE quality.rectification_tasks
      SET status = ${result === 'approved' ? 'reviewed' : 'pending'},
          review_result = ${result},
          review_note = ${note},
          reviewed_by = ${reviewerId},
          reviewed_at = now(),
          updated_at = now()
    WHERE id = ${id}
      AND status = 'rectified'`;
  return (rows as unknown as { count: number }).count;
}

/* ------------------------------ 统计 ------------------------------ */

export interface RectificationStats {
  total: number;
  pending: number;
  inProgress: number;
  rectified: number;
  reviewed: number;
  overdue: number;
  /** 整改完成率（已复核通过 / 总数） */
  completionRate: number;
}

export async function getRectificationStats(
  sql?: DbExecutor,
): Promise<RectificationStats> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'pending') AS pending,
      count(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      count(*) FILTER (WHERE status = 'rectified') AS rectified,
      count(*) FILTER (WHERE status = 'reviewed') AS reviewed,
      count(*) FILTER (WHERE deadline IS NOT NULL AND deadline < now()
        AND status <> 'reviewed') AS overdue
    FROM quality.rectification_tasks`;
  const r = rows[0] as Record<string, unknown>;
  const total = Number(r.total);
  const reviewed = Number(r.reviewed);
  return {
    total,
    pending: Number(r.pending),
    inProgress: Number(r.in_progress),
    rectified: Number(r.rectified),
    reviewed,
    overdue: Number(r.overdue),
    completionRate: total > 0 ? Math.round((reviewed / total) * 1000) / 10 : 0,
  };
}
