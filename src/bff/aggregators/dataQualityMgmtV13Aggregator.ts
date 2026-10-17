/**
 * 健澜科技 jlmedaios - 数据质量管理 V13 纯函数（M409-B）
 *
 * computeDataCompletenessRateV13 / computeDataAccuracyRateV13 / computeDataTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 数据质量管理记录 */
export interface DataQualityMgmtRecordV13 {
  complete: number;
  should: number;
  accurate: number;
  total: number;
  timely: number;
  shouldReport: number;
}

/**
 * 数据完整率（纯函数）：完整字段数/应填字段总数×100，保留 2 位小数。
 *
 * @param records 数据质量管理记录列表
 * @returns 数据完整率百分比
 */
export function computeDataCompletenessRateV13(records: DataQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.should, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 数据准确率（纯函数）：准确数据条数/校验总条数×100，保留 2 位小数。
 *
 * @param records 数据质量管理记录列表
 * @returns 数据准确率百分比
 */
export function computeDataAccuracyRateV13(records: DataQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 数据及时率（纯函数）：及时上报条数/应上报总条数×100，保留 2 位小数。
 *
 * @param records 数据质量管理记录列表
 * @returns 数据及时率百分比
 */
export function computeDataTimelinessRateV13(records: DataQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldReport, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}
