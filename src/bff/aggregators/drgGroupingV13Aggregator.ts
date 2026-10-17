/**
 * 健澜科技 jlmedaios - DRG 分组 V13 纯函数（M334-C）
 *
 * computeGroupingRateV13 / computeLowWeightRateV13 / computeHighWeightRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 分组记录 */
export interface DRGRecordV13 {
  totalCases: number;
  groupedCases: number;
  lowWeightCases: number;
  highWeightCases: number;
}

/**
 * 入组率（纯函数）：入组病例数/总病例数×100。
 *
 * @param records DRG 分组记录列表
 * @returns 入组率百分比
 */
export function computeGroupingRateV13(records: DRGRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCases, 0);
  const grouped = records.reduce((acc, r) => acc + r.groupedCases, 0);
  if (total === 0) return 0;
  return Math.round((grouped / total) * 100);
}

/**
 * 低倍率病例占比（纯函数）：低倍率数/总数×100。
 *
 * @param records DRG 分组记录列表
 * @returns 低倍率占比百分比
 */
export function computeLowWeightRateV13(records: DRGRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCases, 0);
  const lowWeight = records.reduce((acc, r) => acc + r.lowWeightCases, 0);
  if (total === 0) return 0;
  return Math.round((lowWeight / total) * 100);
}

/**
 * 高倍率病例占比（纯函数）：高倍率数/总数×100。
 *
 * @param records DRG 分组记录列表
 * @returns 高倍率占比百分比
 */
export function computeHighWeightRateV13(records: DRGRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCases, 0);
  const highWeight = records.reduce((acc, r) => acc + r.highWeightCases, 0);
  if (total === 0) return 0;
  return Math.round((highWeight / total) * 100);
}
