/**
 * 健澜科技 jlmedaios - PICC/输液港维护纯函数（M68-A）
 * 维护到期判定 / 并发症分级 / 告警判定。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type Complication = 'none' | 'thrombosis' | 'infection' | 'dislodged' | 'occluded';

/** 距上次维护超过 7 天 -> 到期。 */
export function dueForMaintenance(lastMaintainedAt: string, today: string): boolean {
  const last = new Date(lastMaintainedAt);
  const now = new Date(today);
  const diffDays = (now.getTime() - last.getTime()) / 86_400_000;
  return diffDays > 7;
}

/** 并发症分级：thrombosis/infection 高危。 */
export function complicationSeverity(complication: Complication): 'low' | 'high' {
  return complication === 'thrombosis' || complication === 'infection' ? 'high' : 'low';
}

/** 非 none -> 需要告警。 */
export function needsAlert(complication: Complication): boolean {
  return complication !== 'none';
}
