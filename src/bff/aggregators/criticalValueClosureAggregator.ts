/**
 * 健澜科技 jlmedaios - 危急值闭环升级聚合器（216）
 *
 * 在 M3-F（报告 raised -> 通知推送 outbox）之上补齐医师侧三段留痕：
 *
 *   报告 -> 通知医生 -> 接收(accept) -> 记录处理时间(process) -> 闭环(close)
 *   pending -> notified -> accepted -> processed -> closed
 *
 * 状态机为纯函数 closureState(record)：状态由时间戳推导，时间戳即状态，
 * 不冗余维护 status 列，从根上杜绝「状态与时间戳漂移」。
 *  - notified_at        由扫描上报侧同事务写入（criticalValueAggregator.scanCritical）
 *  - doctor_accepted_at 医生接收（acceptView）
 *  - processed_at       记录处理时间 + 处置备注（processView）
 *  - closed_at          闭环（closeView）
 *
 * 并发：DB 动作内 FOR UPDATE 行锁，锁行后再跑纯函数校验转移白名单。
 * 权限：仅要求登录（auth），不新增权限码；不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import {
  lockClosureById,
  updateClosure,
  type CriticalClosure,
} from '../../db/repositories/criticalValueRepo.js';

export class ClosureError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ClosureError';
  }
}
const badRequest = (m: string) => new ClosureError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ClosureError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new ClosureError(409, 'CONFLICT', m);
const unauthorized = (m: string) => new ClosureError(401, 'UNAUTHORIZED', m);

/* ------------------------------- 纯函数 ------------------------------- */

/** 闭环五段状态。 */
export type ClosureStage = 'pending' | 'notified' | 'accepted' | 'processed' | 'closed';

/** 状态转移白名单（单向，无回退）。 */
export const CLOSURE_TRANSITIONS: Record<ClosureStage, readonly ClosureStage[]> = {
  pending: ['notified'],
  notified: ['accepted'],
  accepted: ['processed'],
  processed: ['closed'],
  closed: [],
};

/**
 * 纯函数：由闭环留痕记录推导当前状态。
 * 时间戳按「越后段优先级越高」短路：
 *   closed_at > processed_at > doctor_accepted_at > notified_at > 默认 pending。
 * 这样记录天然单调：一旦写入后段时间戳，状态自动前进，无需单独维护状态列。
 */
export function closureState(r: Pick<CriticalClosure,
  | 'notifiedAt' | 'doctorAcceptedAt' | 'processedAt' | 'closedAt'>): ClosureStage {
  if (r.closedAt) return 'closed';
  if (r.processedAt) return 'processed';
  if (r.doctorAcceptedAt) return 'accepted';
  if (r.notifiedAt) return 'notified';
  return 'pending';
}

/** 校验 from -> to 是否在白名单内，非法抛 409。 */
function ensureTransition(from: ClosureStage, to: ClosureStage): void {
  if (!CLOSURE_TRANSITIONS[from].includes(to)) {
    throw conflict(`当前状态为 ${from}，不可执行「${to}」`);
  }
}

/**
 * 纯函数：医生接收（notified -> accepted）。
 * 返回写好 doctor_accepted_at / doctor_accepted_by 的完整记录（用于整行落库）。
 */
export function acceptView(
  record: CriticalClosure,
  doctorId: string,
  at: string = new Date().toISOString(),
): CriticalClosure {
  ensureTransition(closureState(record), 'accepted');
  return { ...record, doctorAcceptedAt: at, doctorAcceptedBy: doctorId };
}

/**
 * 纯函数：记录处理时间（accepted -> processed），须带处置记录。
 */
export function processView(
  record: CriticalClosure,
  doctorId: string,
  note: string,
  at: string = new Date().toISOString(),
): CriticalClosure {
  if (!note || !note.trim()) throw badRequest('处置记录不能为空');
  ensureTransition(closureState(record), 'processed');
  return { ...record, processedAt: at, processedBy: doctorId, processedNote: note.trim() };
}

/**
 * 纯函数：闭环（processed -> closed）。
 */
export function closeView(
  record: CriticalClosure,
  doctorId: string,
  at: string = new Date().toISOString(),
): CriticalClosure {
  ensureTransition(closureState(record), 'closed');
  return { ...record, closedAt: at, closedBy: doctorId };
}

/* ------------------------------- DB 动作 ------------------------------- */

function actorOf(view: AuthView | null | undefined): string {
  if (!view?.id) throw unauthorized('未登录');
  return view.id;
}

/** 医生接收危急值通知：notified -> accepted。 */
export async function acceptClosure(view: AuthView, id: string): Promise<CriticalClosure> {
  const doctorId = actorOf(view);
  return withTx(async (tx) => {
    const row = await lockClosureById(id, tx);
    if (!row) throw notFound('危急值记录不存在');
    const next = acceptView(row, doctorId);
    return updateClosure(id, next, tx);
  });
}

/** 医生记录处理时间与处置说明：accepted -> processed。 */
export async function processClosure(
  view: AuthView,
  id: string,
  note: string,
): Promise<CriticalClosure> {
  const doctorId = actorOf(view);
  return withTx(async (tx) => {
    const row = await lockClosureById(id, tx);
    if (!row) throw notFound('危急值记录不存在');
    const next = processView(row, doctorId, note);
    return updateClosure(id, next, tx);
  });
}

/** 闭环：processed -> closed。 */
export async function closeClosure(view: AuthView, id: string): Promise<CriticalClosure> {
  const doctorId = actorOf(view);
  return withTx(async (tx) => {
    const row = await lockClosureById(id, tx);
    if (!row) throw notFound('危急值记录不存在');
    const next = closeView(row, doctorId);
    return updateClosure(id, next, tx);
  });
}
