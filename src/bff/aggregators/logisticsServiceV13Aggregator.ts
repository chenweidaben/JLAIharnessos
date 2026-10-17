/**
 * 健澜科技 jlmedaios - 后勤服务 V13 纯函数（M377-A）
 *
 * computeBeddingWashCountV13 / computeMealSupplyCountV13 / computePropertyWorkOrderCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 后勤服务记录 */
export interface LogisticsServiceRecordV13 {
  beddingWashCount: number;
  mealSupplyCount: number;
  workOrderTotalCount: number;
  workOrderCompleteCount: number;
}

/**
 * 被服洗涤量（纯函数）：求和，单位件。
 *
 * @param records 后勤服务记录列表
 * @returns 被服洗涤量
 */
export function computeBeddingWashCountV13(records: LogisticsServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.beddingWashCount, 0);
}

/**
 * 膳食供应人次（纯函数）：求和。
 *
 * @param records 后勤服务记录列表
 * @returns 膳食供应人次
 */
export function computeMealSupplyCountV13(records: LogisticsServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.mealSupplyCount, 0);
}

/**
 * 物业工单完成率（纯函数）：完成数/工单总数×100，保留 2 位小数。
 *
 * @param records 后勤服务记录列表
 * @returns 物业工单完成率百分比
 */
export function computePropertyWorkOrderCompletionRateV13(records: LogisticsServiceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.workOrderTotalCount, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.workOrderCompleteCount, 0);
  return Math.round((complete / total) * 10000) / 100;
}
