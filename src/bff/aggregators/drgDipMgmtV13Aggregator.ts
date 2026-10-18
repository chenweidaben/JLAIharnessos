/**
 * 健澜科技 jlmedaios - DRG/DIP 管理 V13 纯函数（M445-D，M445 收官，医保物价与费用管理组）
 *
 * computeDrgDipEnrollmentRateV13 / computeDrgDipCoverageRateV13 / computeDrgDipWeightBreakEvenRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG/DIP 管理记录 */
export interface DrgDipMgmtRecordV13 {
  enrolled: number;
  totalDrg: number;
  coveredDisease: number;
  totalDisease: number;
  breakEven: number;
  totalGroup: number;
}

/**
 * DRG 入组率（纯函数）：已入组 DRG 病例数/DRG 病例总数×100，保留 2 位小数。
 *
 * @param records DRG/DIP 管理记录列表
 * @returns DRG 入组率百分比
 */
export function computeDrgDipEnrollmentRateV13(records: DrgDipMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDrg, 0);
  if (total === 0) return 0;
  const enrolledCount = records.reduce((acc, r) => acc + r.enrolled, 0);
  return Math.round((enrolledCount / total) * 10000) / 100;
}

/**
 * DIP 病种覆盖率（纯函数）：DIP 覆盖病品种数/DIP 应覆盖病品种总数×100，保留 2 位小数。
 *
 * @param records DRG/DIP 管理记录列表
 * @returns DIP 病种覆盖率百分比
 */
export function computeDrgDipCoverageRateV13(records: DrgDipMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDisease, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.coveredDisease, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 权重盈亏平衡率（纯函数）：盈亏平衡病组数/病组总数×100，保留 2 位小数。
 *
 * @param records DRG/DIP 管理记录列表
 * @returns 权重盈亏平衡率百分比
 */
export function computeDrgDipWeightBreakEvenRateV13(records: DrgDipMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalGroup, 0);
  if (total === 0) return 0;
  const breakEvenCount = records.reduce((acc, r) => acc + r.breakEven, 0);
  return Math.round((breakEvenCount / total) * 10000) / 100;
}
