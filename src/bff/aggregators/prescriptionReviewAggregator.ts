/**
 * 健澜科技 jlmedaios - 处方点评聚合器
 *
 * 药师事后点评闭环：
 *  - listView    ：待点评处方列表 + 最近点评记录 + 结果统计（GET 首页）；
 *  - reviewView  ：提交一条点评结论（合理 / 不合理 / 超常 + 点评意见），落库；
 *  - feedbackView：结果统计反馈（总数 / 合理 / 不合理 / 超常 / 合理率 / 待点评数）。
 *
 * 与合理用药实时审查（drugReviewAggregator，CDS 实时提醒）的边界：
 * 本模块只记录药师人工点评结论，不拦截处方、不改变处方审批状态。
 *
 * 统计口径：summarizeResults 为纯函数、无 I/O，供单测与前端统计卡复用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import * as repo from '../../db/repositories/prescriptionReviewRepo.js';

export class PrescriptionReviewError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PrescriptionReviewError';
  }
}

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type ReviewResult = 'rational' | 'irrational' | 'abnormal';

export const REVIEW_RESULTS: readonly ReviewResult[] = ['rational', 'irrational', 'abnormal'];

/** 结论中文标签 */
export const RESULT_LABEL: Record<ReviewResult, string> = {
  rational: '合理',
  irrational: '不合理',
  abnormal: '超常',
};

/** 结果统计（统计卡数据结构） */
export interface ReviewStats {
  total: number;
  rational: number;
  irrational: number;
  abnormal: number;
  /** 合理率 = 合理 / 已点评总数，0~100，无数据为 0 */
  rationalRate: number;
  /** 待点评处方数 */
  pending: number;
}

// ---------------------------------------------------------------------------
// 纯函数：结果统计（无 I/O，单测覆盖）
// ---------------------------------------------------------------------------

/**
 * 对点评记录做结果统计。
 *  - 非法输入（非数组 / 未知 result）安全降级为 0，绝不抛错；
 *  - rationalRate 保留 1 位小数的百分数（0~100）。
 */
export function summarizeResults(
  records: Array<Pick<repo.PrescriptionReview, 'result'>>,
  pendingCount = 0,
): ReviewStats {
  const list = Array.isArray(records) ? records : [];
  const safePending = Number.isFinite(pendingCount) && pendingCount > 0 ? Math.floor(pendingCount) : 0;

  let rational = 0;
  let irrational = 0;
  let abnormal = 0;
  for (const r of list) {
    if (r?.result === 'rational') rational += 1;
    else if (r?.result === 'irrational') irrational += 1;
    else if (r?.result === 'abnormal') abnormal += 1;
  }
  const total = rational + irrational + abnormal;
  const rationalRate = total > 0 ? Math.round((rational / total) * 1000) / 10 : 0;
  return { total, rational, irrational, abnormal, rationalRate, pending: safePending };
}

// ---------------------------------------------------------------------------
// 视图入口（仅要求登录态，不单独设权限码）
// ---------------------------------------------------------------------------

function requireUser(view: AuthView): void {
  if (!view?.id) throw new PrescriptionReviewError(401, '未登录');
}

/** 待点评处方列表 + 最近点评 + 统计（GET /api/v1/prescription-review） */
export async function listView(view: AuthView) {
  requireUser(view);
  const [pending, recent] = await Promise.all([repo.listPending(), repo.listAll(50)]);
  return {
    pending,
    recent: recent.slice(0, 20),
    stats: summarizeResults(recent, pending.length),
  };
}

/** 提交一条点评（POST /api/v1/prescription-review） */
export async function reviewView(view: AuthView, body: Record<string, unknown>) {
  requireUser(view);
  const prescriptionId = String(body.prescriptionId ?? '').trim();
  if (!prescriptionId) throw new PrescriptionReviewError(400, 'prescriptionId 必填');

  const result = String(body.result ?? '') as ReviewResult;
  if (!REVIEW_RESULTS.includes(result)) {
    throw new PrescriptionReviewError(400, 'result 必须为 rational / irrational / abnormal 之一');
  }

  const comment = body.comment != null ? String(body.comment).trim() : '';
  const created = await repo.create({
    prescriptionId,
    reviewerId: view.id,
    result,
    comment: comment || null,
  });
  return {
    ...created,
    resultLabel: RESULT_LABEL[created.result],
  };
}

/** 结果统计反馈（结果统计卡数据） */
export async function feedbackView(view: AuthView): Promise<ReviewStats> {
  requireUser(view);
  const [pending, recent] = await Promise.all([repo.listPending(), repo.listAll(200)]);
  return summarizeResults(recent, pending.length);
}
