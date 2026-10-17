/**
 * 健澜科技 jlmedaios - 安全生产 V13 纯函数（M385-D，M385 收官）
 *
 * computeSafetyInspectionCountV13 / computeHazardRectificationRateV13 / computeAccidentCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全生产记录 */
export interface SafetyProductionRecordV13 {
  inspectionCount: number;
  rectifiedCount: number;
  totalHazardCount: number;
  accidentCount: number;
}

/**
 * 安全检查次数（纯函数）：求和。
 *
 * @param records 安全生产记录列表
 * @returns 安全检查次数
 */
export function computeSafetyInspectionCountV13(records: SafetyProductionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inspectionCount, 0);
}

/**
 * 隐患整改率（纯函数）：已整改隐患数/排查隐患数×100，保留 2 位小数。
 *
 * @param records 安全生产记录列表
 * @returns 隐患整改率百分比
 */
export function computeHazardRectificationRateV13(records: SafetyProductionRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalHazardCount, 0);
  if (total === 0) return 0;
  const rectified = records.reduce((acc, r) => acc + r.rectifiedCount, 0);
  return Math.round((rectified / total) * 10000) / 100;
}

/**
 * 事故发生数（纯函数）：求和。
 *
 * @param records 安全生产记录列表
 * @returns 事故发生数
 */
export function computeAccidentCountV13(records: SafetyProductionRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.accidentCount, 0);
}
