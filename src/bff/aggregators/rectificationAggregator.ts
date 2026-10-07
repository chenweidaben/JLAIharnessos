/**
 * 健澜科技数智医院智能体 - 缺陷整改闭环聚合器（M9-B）
 *
 * 终末质控"缺陷级"整改：
 *  下发整改（质控人）→ 责任医生整改 → 质控复核（通过/驳回）→ 可追溯。
 *
 * 职责边界：
 *  - 本聚合器只做"缺陷级整改任务"，与 M2-B 病历级三级签名互补；
 *  - 权限：下发/复核须 quality:review（质控人）；整改提交须为任务 assignee；
 *  - 所有写操作在事务内，审计哈希链与业务变更同提交同回滚。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { getMedicalRecordById } from '../../db/repositories/medicalRecordRepo.js';
import {
  applyRectify,
  applyReview,
  createRectificationTask,
  getRectificationStats,
  getTaskById,
  getTaskForUpdate,
  getTaskViewById,
  listTasksView,
  type CreateRectificationInput,
  type RectificationDefectLevel,
  type RectificationDefectType,
  type RectificationStatus,
  type RectificationTask,
  type RectificationTaskView,
} from '../../db/repositories/rectificationRepo.js';
import type { AuthView } from '../view/userView.js';

/* ------------------------------ 错误 ------------------------------ */

export class RectificationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RectificationError';
  }
}
const badRequest = (m: string) => new RectificationError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new RectificationError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new RectificationError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new RectificationError(409, 'CONFLICT', m);

/* ------------------------------ 权限判定 ------------------------------ */

function isReviewer(auth: AuthView): boolean {
  return auth.permissions.includes('quality:review');
}

/** 可查看该任务：质控人或 assignee 本人。 */
function canViewTask(auth: AuthView, task: RectificationTask): boolean {
  return isReviewer(auth) || task.assigneeId === auth.id;
}

/* ------------------------------ 下发整改 ------------------------------ */

export interface CreateRectificationBody {
  recordId: string;
  defectRuleId: string;
  defectMessage: string;
  defectType: RectificationDefectType;
  defectLevel: RectificationDefectLevel;
  defectSection?: string | null;
  deduction?: number;
  /** 可指定责任医生；不指定则默认病历作者。 */
  assigneeId?: string | null;
  deadline?: Date | null;
}

/**
 * 质控人确认缺陷后下发整改任务。
 * 同病历同缺陷（record_id + defect_rule_id）幂等，只一条。
 */
export async function issueRectification(
  auth: AuthView,
  body: CreateRectificationBody,
): Promise<{ task: RectificationTask; created: boolean }> {
  if (!isReviewer(auth)) throw forbidden('无质控复核权限，不能下发整改任务');
  if (!body.recordId?.trim()) throw badRequest('缺少病历 ID');
  if (!body.defectRuleId?.trim()) throw badRequest('缺少缺陷规则 ID');
  if (!body.defectMessage?.trim()) throw badRequest('缺少缺陷描述');
  if (!['integrity', 'standardization', 'logic', 'timeliness'].includes(body.defectType)) {
    throw badRequest('缺陷类型非法');
  }
  if (!['minor', 'major', 'critical'].includes(body.defectLevel)) {
    throw badRequest('缺陷级别非法');
  }

  const record = await getMedicalRecordById(body.recordId);
  if (!record) throw notFound('病历不存在');

  // 责任医生：显式指定优先，否则默认病历作者
  const assigneeId = body.assigneeId?.trim() || record.authorId;
  if (!assigneeId) throw badRequest('无法确定整改责任医生（病历作者缺失），请显式指定');

  const input: CreateRectificationInput = {
    recordId: body.recordId,
    visitId: record.visitId,
    defectRuleId: body.defectRuleId,
    defectSection: body.defectSection ?? null,
    defectMessage: body.defectMessage,
    defectType: body.defectType,
    defectLevel: body.defectLevel,
    deduction: body.deduction ?? 0,
    assigneeId,
    createdById: auth.id,
    deadline: body.deadline ?? null,
  };

  const result = await getDb().begin(async (tx: DbExecutor) => {
    const r = await createRectificationTask(input, tx);
    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles[0] ?? null,
        actorDept: auth.deptName,
        action: 'quality.rectification.issue',
        resourceType: 'rectification_task',
        resourceId: r.task.id,
        visitRef: record.visitId,
        riskLevel: body.defectLevel === 'critical' ? 'high' : 'medium',
        result: 'success',
        detail: {
          recordId: body.recordId,
          defectRuleId: body.defectRuleId,
          defectLevel: body.defectLevel,
          created: r.created,
        },
      },
      tx,
    );
    return r;
  });

  return result;
}

/* ------------------------------ 列表 ------------------------------ */

export interface ListRectificationBody {
  assigneeId?: string | null;
  status?: RectificationStatus | null;
  overdue?: boolean;
}

/**
 * 整改任务列表：
 *  - 质控人：可看全部（可按 assignee / status 过滤）；
 *  - 责任医生：只看自己负责的。
 */
export async function getRectificationList(
  auth: AuthView,
  filter: ListRectificationBody = {},
): Promise<RectificationTaskView[]> {
  if (isReviewer(auth)) {
    return listTasksView({
      assigneeId: filter.assigneeId ?? null,
      status: filter.status ?? null,
      overdue: filter.overdue ?? false,
    });
  }
  // 普通医生：强制限定为本人
  return listTasksView({
    assigneeId: auth.id,
    status: filter.status ?? null,
    overdue: filter.overdue ?? false,
  });
}

/* ------------------------------ 详情 ------------------------------ */

export async function getRectificationDetail(
  auth: AuthView,
  taskId: string,
): Promise<RectificationTaskView> {
  const task = await getTaskViewById(taskId);
  if (!task) throw notFound('整改任务不存在');
  if (!canViewTask(auth, task)) throw forbidden('无权查看该整改任务');
  return task;
}

/* ------------------------------ 责任医生提交整改 ------------------------------ */

export interface SubmitRectifyBody {
  content: string;
  note?: string | null;
}

/** 责任医生提交整改：assignee 本人，pending/in_progress → rectified。 */
export async function submitRectification(
  auth: AuthView,
  taskId: string,
  body: SubmitRectifyBody,
): Promise<RectificationTask> {
  if (!auth.permissions.includes('quality:rectify')) {
    throw forbidden('无整改提交权限');
  }
  if (!body.content?.trim()) throw badRequest('整改内容不能为空');

  return getDb().begin(async (tx: DbExecutor) => {
    const task = await getTaskForUpdate(taskId, tx);
    if (!task) throw notFound('整改任务不存在');
    if (task.assigneeId !== auth.id) {
      throw forbidden('只有该任务的责任医生能提交整改');
    }
    if (task.status !== 'pending' && task.status !== 'in_progress') {
      throw conflict(`当前状态 ${task.status} 不能提交整改（仅待整改/整改中可提交）`);
    }

    const count = await applyRectify(taskId, body.content.trim(), body.note ?? null, tx);
    if (count === 0) throw conflict('状态已变更，请刷新后重试');

    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles[0] ?? null,
        actorDept: auth.deptName,
        action: 'quality.rectification.submit',
        resourceType: 'rectification_task',
        resourceId: taskId,
        visitRef: task.visitId,
        riskLevel: 'medium',
        result: 'success',
        detail: { defectRuleId: task.defectRuleId },
      },
      tx,
    );

    const updated = await getTaskForUpdate(taskId, tx);
    return updated as RectificationTask;
  });
}

/* ------------------------------ 质控复核 ------------------------------ */

export interface ReviewRectificationBody {
  result: 'approved' | 'rejected';
  note?: string | null;
}

/** 质控人复核：rectified → reviewed（通过）/ pending（驳回）。 */
export async function reviewRectification(
  auth: AuthView,
  taskId: string,
  body: ReviewRectificationBody,
): Promise<RectificationTask> {
  if (!isReviewer(auth)) throw forbidden('无质控复核权限');
  if (body.result !== 'approved' && body.result !== 'rejected') {
    throw badRequest('复核结果须为 approved 或 rejected');
  }
  if (body.result === 'rejected' && !body.note?.trim()) {
    throw badRequest('驳回整改须填写驳回原因');
  }

  return getDb().begin(async (tx: DbExecutor) => {
    const task = await getTaskForUpdate(taskId, tx);
    if (!task) throw notFound('整改任务不存在');
    if (task.status !== 'rectified') {
      throw conflict(`当前状态 ${task.status} 不能复核（仅已整改待复核可复核）`);
    }

    const count = await applyReview(taskId, body.result, body.note ?? null, auth.id, tx);
    if (count === 0) throw conflict('状态已变更，请刷新后重试');

    await recordChainAudit(
      {
        actorId: auth.id,
        actorName: auth.realName ?? auth.username,
        actorRole: auth.rawRoles[0] ?? null,
        actorDept: auth.deptName,
        action:
          body.result === 'approved'
            ? 'quality.rectification.approve'
            : 'quality.rectification.reject',
        resourceType: 'rectification_task',
        resourceId: taskId,
        visitRef: task.visitId,
        riskLevel: body.result === 'rejected' ? 'medium' : 'low',
        result: 'success',
        detail: { defectRuleId: task.defectRuleId, note: body.note ?? null },
      },
      tx,
    );

    const updated = await getTaskForUpdate(taskId, tx);
    return updated as RectificationTask;
  });
}

/* ------------------------------ 统计 ------------------------------ */

export interface RectificationStatsView {
  total: number;
  pending: number;
  inProgress: number;
  rectified: number;
  reviewed: number;
  overdue: number;
  completionRate: number;
}

/** 统计：质控人看全部；责任医生只看自己。 */
export async function getRectificationStatsView(
  auth: AuthView,
): Promise<RectificationStatsView> {
  if (isReviewer(auth)) {
    return getRectificationStats();
  }
  // 责任医生：用列表结果在内存统计（只含本人）
  const mine = await listTasksView({ assigneeId: auth.id });
  const total = mine.length;
  const reviewed = mine.filter((t) => t.status === 'reviewed').length;
  const overdue = mine.filter(
    (t) => t.deadline != null && new Date(t.deadline) < new Date() && t.status !== 'reviewed',
  ).length;
  return {
    total,
    pending: mine.filter((t) => t.status === 'pending').length,
    inProgress: mine.filter((t) => t.status === 'in_progress').length,
    rectified: mine.filter((t) => t.status === 'rectified').length,
    reviewed,
    overdue,
    completionRate: total > 0 ? Math.round((reviewed / total) * 1000) / 10 : 0,
  };
}
