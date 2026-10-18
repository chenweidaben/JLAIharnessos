/**
 * 健澜科技 jlmedaios - 安全生产管理 V13 纯函数（M447-C，应急管理与安全生产管理组）
 *
 * computeSafetyProductionHazardRectificationRateV13 / computeSafetyProductionTrainingCoverageRateV13 / computeSafetyProductionAccidentCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 安全生产管理记录 */
export interface SafetyProductionMgmtRecordV13 {
  rectified: number;
  totalHazard: number;
  trained: number;
  shouldTrain: number;
  accident: boolean;
}

/**
 * 安全隐患排查整改率（纯函数）：已整改隐患数/排查隐患总数×100，保留 2 位小数。
 *
 * @param records 安全生产管理记录列表
 * @returns 安全隐患排查整改率百分比
 */
export function computeSafetyProductionHazardRectificationRateV13(records: SafetyProductionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalHazard, 0);
  if (total === 0) return 0;
  const rectifiedCount = records.reduce((acc, r) => acc + r.rectified, 0);
  return Math.round((rectifiedCount / total) * 10000) / 100;
}

/**
 * 安全培训覆盖率（纯函数）：已培训人数/应培训总人数×100，保留 2 位小数。
 *
 * @param records 安全生产管理记录列表
 * @returns 安全培训覆盖率百分比
 */
export function computeSafetyProductionTrainingCoverageRateV13(records: SafetyProductionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTrain, 0);
  if (total === 0) return 0;
  const trainedCount = records.reduce((acc, r) => acc + r.trained, 0);
  return Math.round((trainedCount / total) * 10000) / 100;
}

/**
 * 安全生产事故数（纯函数，计数指标，反向指标越低越好）：返回 records.filter(r => r.accident).length。
 *
 * @param records 安全生产管理记录列表
 * @returns 安全生产事故数（整数）
 */
export function computeSafetyProductionAccidentCountV13(records: SafetyProductionMgmtRecordV13[]): number {
  return records.filter((r) => r.accident).length;
}
