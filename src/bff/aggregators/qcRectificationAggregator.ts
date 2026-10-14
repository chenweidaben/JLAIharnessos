/**
 * 健澜科技 jlmedaios - 质控整改闭环看板 Aggregator（215）
 *
 * issue → 整改任务 → 复核关闭 闭环：
 *  - nextStatus：纯函数状态机，open→fixed→reviewed→closed，终态/非法输入抛错；
 *  - listView：看板全量列表（前端按 status 分列）；
 *  - createView：由质控 issue 新建一条 open 整改任务；
 *  - transitionView：按状态机前推一步，进入 closed 时写 closed_at。
 *
 * 仅要求登录（auth），不新增权限码；不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as repo from '@/db/repositories/qcRectificationRepo';
import type { QcRectificationStatus } from '@/db/repositories/qcRectificationRepo';
import type { AuthView } from '../view/userView.js';

export class QcRectificationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ------------------------------- 纯函数 ------------------------------- */

/** 状态流转表：open→fixed→reviewed→closed */
const NEXT: Record<QcRectificationStatus, QcRectificationStatus> = {
  open: 'fixed',
  fixed: 'reviewed',
  reviewed: 'closed',
  closed: 'closed',
};

/**
 * 纯函数：当前状态 → 下一状态。
 * open→fixed→reviewed→closed；closed 为终态（幂等返回 closed）；
 * 非法/未知状态抛错，保证状态机被显式驱动。
 */
export function nextStatus(current: string): QcRectificationStatus {
  if (current === 'open' || current === 'fixed' || current === 'reviewed' || current === 'closed') {
    return NEXT[current];
  }
  throw new QcRectificationError(400, `未知整改状态：${String(current)}`);
}

/* ------------------------------- 视图层 ------------------------------- */

/** 看板全量列表（登录即可见）。 */
export async function listView(_view: AuthView): Promise<repo.QcRectification[]> {
  return repo.listRectifications();
}

export interface CreateRectificationBody {
  issueId?: string;
  assigneeId?: string;
  note?: string;
}

/** 由质控 issue 新建一条整改任务（初始 open）。 */
export async function createView(view: AuthView, body: CreateRectificationBody) {
  if (!view?.id) throw new QcRectificationError(401, '未登录');
  return repo.createRectification({
    issueId: body.issueId || null,
    assigneeId: body.assigneeId || null,
    note: body.note || null,
  });
}

export interface TransitionRectificationBody {
  note?: string;
}

/**
 * 状态前推一步：
 *  - 读取当前任务，nextStatus 算出下一状态；
 *  - 进入 closed 时写 closed_at；可选备注 note 合并落库。
 */
export async function transitionView(view: AuthView, id: string, body: TransitionRectificationBody) {
  if (!view?.id) throw new QcRectificationError(401, '未登录');
  const current = await repo.getRectificationById(id);
  if (!current) throw new QcRectificationError(404, '整改任务不存在');

  let next: QcRectificationStatus;
  try {
    next = nextStatus(current.status);
  } catch (e) {
    throw e instanceof QcRectificationError ? e : new QcRectificationError(400, '状态非法');
  }
  if (current.status === 'closed') {
    throw new QcRectificationError(400, '整改任务已关闭，不可再流转');
  }

  const note = body.note && String(body.note).trim() ? String(body.note).trim() : null;
  const closedAt = next === 'closed' ? new Date().toISOString() : null;

  return repo.transitionRectification(id, { status: next, note, closedAt });
}
