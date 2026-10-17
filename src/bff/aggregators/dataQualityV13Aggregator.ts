/**
 * 健澜科技 jlmedaios - 数据质量 V13 纯函数（M344-C）
 *
 * computeCompletenessRateV13 / computeAccuracyRateV13 /
 * computeConsistencyRateV13 / computeTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据质量记录 */
export interface DataQualityRecordV13 {
  completedFields: number;
  requiredFields: number;
  accurateCount: number;
  sampledCount: number;
  consistentCount: number;
  consistentSampledCount: number;
  timelyCount: number;
  totalCount: number;
}

/**
 * 比率计算器（纯函数内部工具）：numerator/denominator×100，保留 1 位小数。
 *
 * @param numerator 分子
 * @param denominator 分母
 * @returns 百分比
 */
function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * 完整率（纯函数）：完整字段数/应填字段数×100。
 *
 * @param records 数据质量记录列表
 * @returns 完整率百分比
 */
export function computeCompletenessRateV13(records: DataQualityRecordV13[]): number {
  const completed = records.reduce((acc, r) => acc + r.completedFields, 0);
  const required = records.reduce((acc, r) => acc + r.requiredFields, 0);
  return rate(completed, required);
}

/**
 * 准确率（纯函数）：准确数/抽查数×100。
 *
 * @param records 数据质量记录列表
 * @returns 准确率百分比
 */
export function computeAccuracyRateV13(records: DataQualityRecordV13[]): number {
  const accurate = records.reduce((acc, r) => acc + r.accurateCount, 0);
  const sampled = records.reduce((acc, r) => acc + r.sampledCount, 0);
  return rate(accurate, sampled);
}

/**
 * 一致率（纯函数）：一致数/抽查数×100。
 *
 * @param records 数据质量记录列表
 * @returns 一致率百分比
 */
export function computeConsistencyRateV13(records: DataQualityRecordV13[]): number {
  const consistent = records.reduce((acc, r) => acc + r.consistentCount, 0);
  const sampled = records.reduce((acc, r) => acc + r.consistentSampledCount, 0);
  return rate(consistent, sampled);
}

/**
 * 及时率（纯函数）：及时数/总数×100。
 *
 * @param records 数据质量记录列表
 * @returns 及时率百分比
 */
export function computeTimelinessRateV13(records: DataQualityRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.timelyCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  return rate(timely, total);
}
