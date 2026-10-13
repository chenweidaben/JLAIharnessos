/**
 * 健澜科技 jlmedaios - 营养科会诊纯函数（M58-A）
 *
 * 方案分级：calories 低/正常/高；随访到期判定。
 * 纯函数无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type PlanTier = 'low' | 'normal' | 'high';

/** 每日能量方案分级。 */
export function planTier(caloriesPerDay: number): PlanTier {
  if (caloriesPerDay < 1500) return 'low';
  if (caloriesPerDay > 2500) return 'high';
  return 'normal';
}

/** 随访是否到期（含当天算到期）。 */
export function followupDue(consultedAt: string, followupDays: number, today: string): boolean {
  const created = new Date(consultedAt).getTime();
  const now = new Date(today).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(now)) return false;
  const elapsedDays = (now - created) / (24 * 60 * 60 * 1000);
  return elapsedDays >= followupDays;
}

/** 未随访且到期。 */
export function needsFollowup(status: string, consultedAt: string, followupDays: number, today: string): boolean {
  if (status !== 'consulted') return false;
  return followupDue(consultedAt, followupDays, today);
}
