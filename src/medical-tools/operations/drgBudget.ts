/**
 * 健澜科技 jlmedaios - DRG 病组预算预警纯函数（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export function ratio(actual: number, budget: number): number {
  if (budget <= 0) return 0;
  return actual / budget;
}

/** ratio>=warning_ratio*1.15 → over；>=warning_ratio → warn；否则 null（不预警）。 */
export function classifyLevel(actual: number, budget: number, warningRatio: number): 'warn' | 'over' | null {
  const r = ratio(actual, budget);
  if (r >= warningRatio * 1.15) return 'over';
  if (r >= warningRatio) return 'warn';
  return null;
}

export function needsAlert(actual: number, budget: number, warningRatio: number): boolean {
  return classifyLevel(actual, budget, warningRatio) !== null;
}
