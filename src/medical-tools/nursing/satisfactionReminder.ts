/**
 * 健澜科技 jlmedaios - 满意度提醒 stage 纯函数（M64-A）
 * discharged_at + today 推导待填阶段。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type ReminderStage = 'none' | 'first' | 'second' | 'done';

/** days 距离出院天数。 */
export function dueStage(daysSinceDischarge: number, hasSubmitted: boolean): ReminderStage {
  if (hasSubmitted) return 'done';
  if (daysSinceDischarge >= 7) return 'second';
  if (daysSinceDischarge >= 3) return 'first';
  return 'none';
}
