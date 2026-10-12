/**
 * 健澜科技 jlmedaios - 事中监控预算基准纯函数（M23-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface SelectionInfo {
  selectedPath: string | null;
  drgExpectedPayment: number | null;
  dipScore: number | null;
  dipPointValue: number | null;
}

export interface BudgetBasis {
  basis: 'drg' | 'dip';
  budget: number;
}

/** 决定预算基准与金额：DIP 落组 → score×pointValue；否则 DRG 预算；无 selection → 默认 drg 0。 */
export function resolveBudgetBasis(sel: SelectionInfo | null): BudgetBasis {
  if (!sel || sel.selectedPath == null) return { basis: 'drg', budget: Number(sel?.drgExpectedPayment ?? 0) };
  const isDip = sel.selectedPath.includes('dip');
  if (isDip) {
    const score = Number(sel.dipScore ?? 0);
    const pv = Number(sel.dipPointValue ?? 0);
    return { basis: 'dip', budget: score * pv };
  }
  return { basis: 'drg', budget: Number(sel.drgExpectedPayment ?? 0) };
}
