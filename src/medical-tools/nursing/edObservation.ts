/**
 * 健澜科技 jlmedaios - 急诊留观纯函数（M74-A）
 * 时长 / 滞留判定 / 告警。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 留观时长（小时）。未出院返回自进入至今的时长。 */
export function durationHours(enteredAt: Date | string, dischargedAt: Date | string | null, now: Date = new Date()): number {
  const entered = new Date(enteredAt).getTime();
  const end = dischargedAt ? new Date(dischargedAt).getTime() : now.getTime();
  return Math.max(0, (end - entered) / 3_600_000);
}

/** 留观超过 24 小时为滞留。 */
export function isOverstay(durationHours: number): boolean {
  return durationHours > 24;
}

/** observing 且滞留 >24h 需告警。 */
export function needsAlert(durationHours: number, status: string): boolean {
  return status === 'observing' && isOverstay(durationHours);
}
