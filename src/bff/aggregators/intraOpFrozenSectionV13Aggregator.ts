/**
 * 健澜科技 jlmedaios - 术中冰冻病理与术后石蜡符合率 V13 纯函数（M339-D）
 *
 * computeFrozenParaffinConcordanceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 术中冰冻病理与术后石蜡符合率记录 */
export interface FrozenSectionRecordV13 {
  totalCases: number;
  concordantCases: number;
}

/**
 * 术中冰冻与术后石蜡符合率（纯函数）：符合例数/总例数×100，保留 1 位小数。
 *
 * @param records 术中冰冻病理与术后石蜡符合率记录列表
 * @returns 符合率百分比
 */
export function computeFrozenParaffinConcordanceV13(records: FrozenSectionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCases, 0);
  const concordant = records.reduce((acc, r) => acc + r.concordantCases, 0);
  if (total === 0) return 0;
  return Math.round((concordant / total) * 1000) / 10;
}
