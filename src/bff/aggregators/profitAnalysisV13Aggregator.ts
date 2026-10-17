/**
 * 健澜科技 jlmedaios - 盈亏分析 V13 纯函数（M407-C）
 *
 * computeSurplusDeficitRateV13 / computeAssetLiabilityRatioV13 / computeReturnOnNetAssetsRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 盈亏分析记录 */
export interface ProfitAnalysisRecordV13 {
  surplus: number;
  totalRevenue: number;
  liability: number;
  asset: number;
  netProfit: number;
  netAsset: number;
}

/**
 * 收支结余率（纯函数）：结余/总收入×100，保留 2 位小数。
 *
 * @param records 盈亏分析记录列表
 * @returns 收支结余率百分比
 */
export function computeSurplusDeficitRateV13(records: ProfitAnalysisRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  const surplus = records.reduce((acc, r) => acc + r.surplus, 0);
  return Math.round((surplus / total) * 10000) / 100;
}

/**
 * 资产负债率（纯函数）：负债总额/资产总额×100，保留 2 位小数。
 *
 * @param records 盈亏分析记录列表
 * @returns 资产负债率百分比
 */
export function computeAssetLiabilityRatioV13(records: ProfitAnalysisRecordV13[]): number {
  const asset = records.reduce((acc, r) => acc + r.asset, 0);
  if (asset === 0) return 0;
  const liability = records.reduce((acc, r) => acc + r.liability, 0);
  return Math.round((liability / asset) * 10000) / 100;
}

/**
 * 净资产收益率（纯函数）：净利润/净资产×100，保留 2 位小数。
 *
 * @param records 盈亏分析记录列表
 * @returns 净资产收益率百分比
 */
export function computeReturnOnNetAssetsRateV13(records: ProfitAnalysisRecordV13[]): number {
  const netAsset = records.reduce((acc, r) => acc + r.netAsset, 0);
  if (netAsset === 0) return 0;
  const netProfit = records.reduce((acc, r) => acc + r.netProfit, 0);
  return Math.round((netProfit / netAsset) * 10000) / 100;
}
