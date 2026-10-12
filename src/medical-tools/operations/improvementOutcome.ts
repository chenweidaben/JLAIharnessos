/**
 * 健澜科技 jlmedaios - 整改效果回看纯函数（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type Verdict = 'pending' | 'effective' | 'partial' | 'no_improvement' | 'worse';

/** baselineRate/followupRate 为超支率（0~1）。下降>=30% effective、下降0-30% partial、持平 no_improvement、上升 worse。 */
export function judgeOutcome(baselineRate: number, followupRate: number): Verdict {
  if (baselineRate <= 0) return followupRate <= 0 ? 'no_improvement' : 'worse';
  const drop = (baselineRate - followupRate) / baselineRate; // 正=下降
  if (drop >= 0.3) return 'effective';
  if (drop > 0) return 'partial';
  if (drop === 0) return 'no_improvement';
  return 'worse';
}
