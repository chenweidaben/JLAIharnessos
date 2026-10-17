/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 纯函数（M343-B）
 *
 * computeCategory1CountV13 / computeCategory2CountV13 / computeAvgCreditV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 继续医学教育记录 */
export interface ContinuingEduRecordV13 {
  category1Count: number;
  category2Count: number;
  avgCredit: number;
}

/**
 * Ⅰ类学分项目数（纯函数）：求和。
 *
 * @param records 继续医学教育记录列表
 * @returns Ⅰ类学分项目数
 */
export function computeCategory1CountV13(records: ContinuingEduRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.category1Count, 0);
}

/**
 * Ⅱ类学分项目数（纯函数）：求和。
 *
 * @param records 继续医学教育记录列表
 * @returns Ⅱ类学分项目数
 */
export function computeCategory2CountV13(records: ContinuingEduRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.category2Count, 0);
}

/**
 * 人均学分数（纯函数）：均值，保留 1 位小数。
 *
 * @param records 继续医学教育记录列表
 * @returns 人均学分数
 */
export function computeAvgCreditV13(records: ContinuingEduRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgCredit, 0);
  return Math.round((sum / records.length) * 10) / 10;
}
