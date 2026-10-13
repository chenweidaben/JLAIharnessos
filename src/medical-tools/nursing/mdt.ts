/**
 * 健澜科技 jlmedaios - MDT 会诊纯函数（M66-A）
 * 状态流转 / 紧急度 / 治疗方案判定。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type MdtStatus = 'requested' | 'scheduled' | 'held' | 'concluded' | 'cancelled';

const NEXT: Record<MdtStatus, MdtStatus[]> = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['held', 'cancelled'],
  held: ['concluded', 'cancelled'],
  concluded: [],
  cancelled: [],
};

/** 当前状态可流转到的下一状态集合。 */
export function nextStatus(current: MdtStatus): MdtStatus[] {
  return NEXT[current] ?? [];
}

/** reason 含"急"或标题含"急"判定紧急。 */
export function isUrgent(reason: string, title: string): boolean {
  return reason.includes('急') || title.includes('急');
}

/** concluded 后是否需要转治疗方案。 */
export function needsTreatmentPlan(status: MdtStatus): boolean {
  return status === 'concluded';
}
