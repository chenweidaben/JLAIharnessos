/**
 * 健澜科技 jlmedaios - 成本控制 V13 纯函数（M345-C）
 *
 * computeOutpatientAvgCostV13 / computeInpatientAvgCostV13 / computeDrugRatioYoyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 成本控制记录 */
export interface CostControlRecordV13 {
  outpatientCost: number;
  inpatientCost: number;
  drugRatioCurrent: number;
  drugRatioPrevious: number;
}

/**
 * 次均门诊费用（纯函数）：均值（元）。
 *
 * @param records 成本控制记录列表
 * @returns 次均门诊费用（元）
 */
export function computeOutpatientAvgCostV13(records: CostControlRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.outpatientCost, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 次均住院费用（纯函数）：均值（元）。
 *
 * @param records 成本控制记录列表
 * @returns 次均住院费用（元）
 */
export function computeInpatientAvgCostV13(records: CostControlRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.inpatientCost, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 药占比同比变化（纯函数）：本期-上期的均值（百分点）。
 *
 * @param records 成本控制记录列表
 * @returns 药占比同比变化（百分点）
 */
export function computeDrugRatioYoyV13(records: CostControlRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + (r.drugRatioCurrent - r.drugRatioPrevious), 0);
  return Math.round((sum / records.length) * 10) / 10;
}
