/**
 * 健澜科技 jlmedaios - DRG/DIP 双轨选择纯函数（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type SelectedPath = 'auto_drg' | 'auto_dip';

/** 选对医院更优者：drg≥dip→auto_drg，否则 auto_dip；相等默认 drg。 */
export function chooseBetter(drgPayment: number, dipPayment: number): SelectedPath {
  return drgPayment >= dipPayment ? 'auto_drg' : 'auto_dip';
}

/** 生成选择依据文字。 */
export function buildRationale(drgPayment: number, dipPayment: number, path: SelectedPath): string {
  return `drg=${drgPayment} vs dip=${dipPayment} -> choose ${path}`;
}
