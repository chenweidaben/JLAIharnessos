/**
 * 健澜科技 jlmedaios - 数据质量明细 V13 纯函数（M379-D，detail 避让，M379 收官）
 *
 * computeDataCompletenessRateV13 / computeDataAccuracyRateV13 / computeDataConsistencyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据质量明细记录 */
export interface DataQualityRecordV13 {
  totalFields: number;
  completeFields: number;
  totalRecords: number;
  accurateRecords: number;
  consistentRecords: number;
}

/**
 * 数据完整率（纯函数）：完整字段数/总字段数×100，保留 2 位小数。
 *
 * @param records 数据质量明细记录列表
 * @returns 数据完整率百分比
 */
export function computeDataCompletenessRateV13(records: DataQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFields, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.completeFields, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 数据准确率（纯函数）：准确记录数/总记录数×100，保留 2 位小数。
 *
 * @param records 数据质量明细记录列表
 * @returns 数据准确率百分比
 */
export function computeDataAccuracyRateV13(records: DataQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateRecords, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 数据一致率（纯函数）：一致记录数/总记录数×100，保留 2 位小数。
 *
 * @param records 数据质量明细记录列表
 * @returns 数据一致率百分比
 */
export function computeDataConsistencyRateV13(records: DataQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  if (total === 0) return 0;
  const consistent = records.reduce((acc, r) => acc + r.consistentRecords, 0);
  return Math.round((consistent / total) * 10000) / 100;
}
