/**
 * 健澜科技 jlmedaios - DIP 点值纯函数（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 月度点值 = 基金池 / 全院总分值；totalScore=0 时返回 0 不除零。 */
export function computePointValue(fundPool: number, totalScore: number): number {
  if (totalScore <= 0) return 0;
  return fundPool / totalScore;
}

/** 病例结算金额 = 病种分值 × 当月点值。 */
export function settleAmount(score: number, pointValue: number): number {
  return score * pointValue;
}
