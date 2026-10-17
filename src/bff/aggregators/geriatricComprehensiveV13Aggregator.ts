/**
 * 健澜科技 jlmedaios - 老年综合评估 V13 纯函数（M350-C）
 *
 * computeCGACountV13 / computeFallScreeningRateV13 / computeComprehensiveManagementRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 老年综合评估记录 */
export interface GeriatricComprehensiveRecordV13 {
  cgaCount: number;
  fallScreenedCount: number;
  geriatricVisits: number;
  managedCount: number;
}

/**
 * CGA 评估数（纯函数）：求和。
 *
 * @param records 老年综合评估记录列表
 * @returns CGA 评估数
 */
export function computeCGACountV13(records: GeriatricComprehensiveRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.cgaCount, 0);
}

/**
 * 跌倒风险筛查率（纯函数）：筛查数/老年就诊数×100，保留 2 位小数。
 *
 * @param records 老年综合评估记录列表
 * @returns 跌倒风险筛查率百分比
 */
export function computeFallScreeningRateV13(records: GeriatricComprehensiveRecordV13[]): number {
  const screened = records.reduce((acc, r) => acc + r.fallScreenedCount, 0);
  const visits = records.reduce((acc, r) => acc + r.geriatricVisits, 0);
  if (visits === 0) return 0;
  return Math.round((screened / visits) * 10000) / 100;
}

/**
 * 老年综合管理率（纯函数）：管理数/老年就诊数×100，保留 2 位小数。
 *
 * @param records 老年综合评估记录列表
 * @returns 老年综合管理率百分比
 */
export function computeComprehensiveManagementRateV13(records: GeriatricComprehensiveRecordV13[]): number {
  const managed = records.reduce((acc, r) => acc + r.managedCount, 0);
  const visits = records.reduce((acc, r) => acc + r.geriatricVisits, 0);
  if (visits === 0) return 0;
  return Math.round((managed / visits) * 10000) / 100;
}
