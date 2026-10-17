/**
 * 健澜科技 jlmedaios - DRG 管理 V13 纯函数（M375-C）
 *
 * computeDrgEnrollmentRateV13 / computeDrgAverageWeightV13 / computeDrgProfitLossV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 管理记录 */
export interface DRGmanagementRecordV13 {
  dischargeCount: number;
  drgEnrolledCount: number;
  averageWeight: number;
  profitLoss: number;
}

/**
 * DRG 入组率（纯函数）：入组病例数/出院病例数×100，保留 2 位小数。
 *
 * @param records DRG 管理记录列表
 * @returns DRG 入组率百分比
 */
export function computeDrgEnrollmentRateV13(records: DRGmanagementRecordV13[]): number {
  const discharge = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharge === 0) return 0;
  const enrolled = records.reduce((acc, r) => acc + r.drgEnrolledCount, 0);
  return Math.round((enrolled / discharge) * 10000) / 100;
}

/**
 * DRG 平均权重（纯函数）：均值，保留 2 位小数。
 *
 * @param records DRG 管理记录列表
 * @returns DRG 平均权重
 */
export function computeDrgAverageWeightV13(records: DRGmanagementRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.averageWeight, 0);
  return Math.round((total / records.length) * 100) / 100;
}

/**
 * DRG 盈亏总额（纯函数）：求和，单位元，保留 2 位小数。
 *
 * @param records DRG 管理记录列表
 * @returns DRG 盈亏总额（元）
 */
export function computeDrgProfitLossV13(records: DRGmanagementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.profitLoss, 0);
  return Math.round(total * 100) / 100;
}
