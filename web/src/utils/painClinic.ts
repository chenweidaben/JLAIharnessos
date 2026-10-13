/**
 * 健澜科技 jlmedaios - 疼痛门诊展示工具（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export const TITRATION_LABEL: Record<string, string> = {
  good: '滴定显效',
  partial: '部分缓解',
  none: '未缓解',
};

export const TITRATION_COLOR: Record<string, string> = {
  good: 'green',
  partial: 'orange',
  none: 'red',
};

/** NRS 数值 → 严重度标签。 */
export function nrsLevel(n: number): string {
  if (n >= 7) return '重度';
  if (n >= 4) return '中度';
  return '轻度';
}
