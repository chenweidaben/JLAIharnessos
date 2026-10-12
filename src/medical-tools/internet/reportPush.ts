/**
 * 健澜科技 jlmedaios - 报告推送纯函数（M19-B）
 *
 * 纯函数、无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 可推送判定：有结论/已审核。 */
export function canPushReport(opts: { reviewed: boolean; hasConclusion: boolean }): boolean {
  return opts.reviewed && opts.hasConclusion;
}

/** 回执状态机：pushed→viewed；再看 view_count+1。 */
export function nextViewState(current: { status: 'pushed' | 'viewed'; viewCount: number }): { status: 'pushed' | 'viewed'; viewCount: number } {
  return { status: 'viewed', viewCount: current.viewCount + 1 };
}

/** 未读计数。 */
export function unreadCount(items: { status: 'pushed' | 'viewed' }[]): number {
  return items.filter((i) => i.status === 'pushed').length;
}
