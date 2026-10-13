/**
 * 健澜科技 jlmedaios - 康复治疗执行状态机/疗效引擎（M51-A）
 *
 * 纯函数、确定性、无 I/O、无随机。
 * 状态流转：prescribed → signed → completed / missed；cancelled 为终态旁路。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type RehabStatus = 'prescribed' | 'signed' | 'completed' | 'missed' | 'cancelled';
export type RehabEvent = 'sign' | 'complete' | 'miss' | 'cancel';
export type Efficacy = 'excellent' | 'good' | 'fair' | 'poor';

/** 合法状态机转换表。非法返回 null。 */
const TRANSITIONS: Record<RehabStatus, Partial<Record<RehabEvent, RehabStatus>>> = {
  prescribed: { sign: 'signed', cancel: 'cancelled' },
  signed: { complete: 'completed', miss: 'missed', cancel: 'cancelled' },
  completed: {},
  missed: {},
  cancelled: {},
};

/** 当前状态 + 事件 → 下一状态；非法转换返回 null。 */
export function nextStatus(current: RehabStatus, event: RehabEvent): RehabStatus | null {
  return TRANSITIONS[current]?.[event] ?? null;
}

/** 疗效量化映射（用于排序/复评触发阈值参考）。 */
const EFFICACY_SCORE: Record<Efficacy, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
};

/** 疗效 → 分值（excellent=4 … poor=1）；未知疗效返回 0。 */
export function efficacyScore(efficacy: Efficacy | null | undefined): number {
  if (!efficacy) return 0;
  return EFFICACY_SCORE[efficacy] ?? 0;
}

/** 是否有效（excellent/good 视为有效）。 */
export function isEffective(efficacy: Efficacy | null | undefined): boolean {
  return efficacy === 'excellent' || efficacy === 'good';
}

/** fair/poor 视为需触发复评工单。 */
export function needsReReview(efficacy: Efficacy | null | undefined): boolean {
  return efficacy === 'fair' || efficacy === 'poor';
}
