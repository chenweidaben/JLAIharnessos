/**
 * 健澜科技 jlmedaios - DRG 绩效 V13 纯函数（M356-A）
 *
 * computeDrgCoveredGroupsV13 / computeCmiValueV13 / computeTimeConsumptionIndexV13 / computeCostConsumptionIndexV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 绩效记录 */
export interface DrgPerformanceRecordV13 {
  coveredGroups: number;
  cmi: number;
  timeConsumptionIndex: number;
  costConsumptionIndex: number;
}

/**
 * DRG 覆盖组数（纯函数）：求和。
 *
 * @param records DRG 绩效记录列表
 * @returns DRG 覆盖组数
 */
export function computeDrgCoveredGroupsV13(records: DrgPerformanceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.coveredGroups, 0);
}

/**
 * CMI 值（纯函数）：均值，保留 3 位小数。
 *
 * @param records DRG 绩效记录列表
 * @returns CMI 值
 */
export function computeCmiValueV13(records: DrgPerformanceRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.cmi, 0);
  return Math.round((sum / records.length) * 1000) / 1000;
}

/**
 * 时间消耗指数（纯函数）：均值，保留 3 位小数。
 *
 * @param records DRG 绩效记录列表
 * @returns 时间消耗指数
 */
export function computeTimeConsumptionIndexV13(records: DrgPerformanceRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.timeConsumptionIndex, 0);
  return Math.round((sum / records.length) * 1000) / 1000;
}

/**
 * 费用消耗指数（纯函数）：均值，保留 3 位小数。
 *
 * @param records DRG 绩效记录列表
 * @returns 费用消耗指数
 */
export function computeCostConsumptionIndexV13(records: DrgPerformanceRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.costConsumptionIndex, 0);
  return Math.round((sum / records.length) * 1000) / 1000;
}
