/**
 * 健澜科技 jlmedaios - 合理用药 V13 纯函数（M359-B，stats 避让已有 rationalDrugUse）
 *
 * computeEssentialDrugCategoryRatioV13 / computeNationalProcurementDrugRatioV13 / computeAdjuvantDrugRevenueRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 合理用药记录 */
export interface RationalDrugUseStatsRecordV13 {
  essentialDrugCategory: number;
  totalDrugCategory: number;
  nationalProcurementEquipped: number;
  nationalProcurementRequired: number;
  adjuvantDrugRevenue: number;
  totalDrugRevenue: number;
}

/**
 * 基本药物品种占比（纯函数）：基本药物品种数/药品总品种数×100，保留 2 位小数。
 *
 * @param records 合理用药记录列表
 * @returns 基本药物品种占比百分比
 */
export function computeEssentialDrugCategoryRatioV13(records: RationalDrugUseStatsRecordV13[]): number {
  const essential = records.reduce((acc, r) => acc + r.essentialDrugCategory, 0);
  const total = records.reduce((acc, r) => acc + r.totalDrugCategory, 0);
  if (total === 0) return 0;
  return Math.round((essential / total) * 10000) / 100;
}

/**
 * 国家集采药品配备率（纯函数）：配备品种数/集采要求品种数×100，保留 2 位小数。
 *
 * @param records 合理用药记录列表
 * @returns 国家集采药品配备率百分比
 */
export function computeNationalProcurementDrugRatioV13(records: RationalDrugUseStatsRecordV13[]): number {
  const equipped = records.reduce((acc, r) => acc + r.nationalProcurementEquipped, 0);
  const required = records.reduce((acc, r) => acc + r.nationalProcurementRequired, 0);
  if (required === 0) return 0;
  return Math.round((equipped / required) * 10000) / 100;
}

/**
 * 辅助用药收入占比（纯函数）：辅助用药收入/药品总收入×100，保留 2 位小数。
 *
 * @param records 合理用药记录列表
 * @returns 辅助用药收入占比百分比
 */
export function computeAdjuvantDrugRevenueRatioV13(records: RationalDrugUseStatsRecordV13[]): number {
  const adjuvant = records.reduce((acc, r) => acc + r.adjuvantDrugRevenue, 0);
  const total = records.reduce((acc, r) => acc + r.totalDrugRevenue, 0);
  if (total === 0) return 0;
  return Math.round((adjuvant / total) * 10000) / 100;
}
