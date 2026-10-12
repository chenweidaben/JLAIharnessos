/**
 * 健澜科技 jlmedaios - 在院费用监控纯函数（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export function levelOf(ratio: number | null, warningRatio: number): 'ok' | 'warn' | 'over' {
  if (ratio == null || ratio <= 0) return 'ok';
  if (ratio >= warningRatio * 1.15) return 'over';
  if (ratio >= warningRatio) return 'warn';
  return 'ok';
}

/** 出院前是否需提醒：level!=ok 且尚未 reminded。 */
export function needsDischargeReview(level: 'ok' | 'warn' | 'over', reminded: boolean): boolean {
  return level !== 'ok' && !reminded;
}
