/**
 * 健澜科技 jlmedaios - 号源配额纯函数（M19-A）
 *
 * 纯函数、无 DB、可单测。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface SlotQuotaInput {
  totalQuota: number;
  bookedCount: number;
  status: 'open' | 'closed';
}

/** 剩余号。 */
export function remainingQuota(s: SlotQuotaInput): number {
  return Math.max(0, s.totalQuota - s.bookedCount);
}

/** 是否可约（剩余>0 且 open）。 */
export function isAvailable(s: SlotQuotaInput): boolean {
  return s.status === 'open' && remainingQuota(s) > 0;
}

/** 并发扣减后是否仍合法（booked<=total）。 */
export function afterBookValidates(totalQuota: number, newBooked: number): boolean {
  return newBooked >= 0 && newBooked <= totalQuota;
}
