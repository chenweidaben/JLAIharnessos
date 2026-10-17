/**
 * 健澜科技 jlmedaios - 营养食堂 V13 纯函数（M352-C）
 *
 * computeHygienePassRateV13 / computeSampleRetentionRateV13 / computeDiningSatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 营养食堂记录 */
export interface NutritionKitchenRecordV13 {
  hygienePassedCount: number;
  hygieneSampledCount: number;
  sampleRetainedCount: number;
  sampleShouldCount: number;
  diningSatisfaction: number;
}

/**
 * 膳食卫生合格率（纯函数）：合格数/抽检数×100，保留 2 位小数。
 *
 * @param records 营养食堂记录列表
 * @returns 膳食卫生合格率百分比
 */
export function computeHygienePassRateV13(records: NutritionKitchenRecordV13[]): number {
  const passed = records.reduce((acc, r) => acc + r.hygienePassedCount, 0);
  const sampled = records.reduce((acc, r) => acc + r.hygieneSampledCount, 0);
  if (sampled === 0) return 0;
  return Math.round((passed / sampled) * 10000) / 100;
}

/**
 * 留样合规率（纯函数）：合规数/应留样数×100，保留 2 位小数。
 *
 * @param records 营养食堂记录列表
 * @returns 留样合规率百分比
 */
export function computeSampleRetentionRateV13(records: NutritionKitchenRecordV13[]): number {
  const retained = records.reduce((acc, r) => acc + r.sampleRetainedCount, 0);
  const should = records.reduce((acc, r) => acc + r.sampleShouldCount, 0);
  if (should === 0) return 0;
  return Math.round((retained / should) * 10000) / 100;
}

/**
 * 就餐满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 营养食堂记录列表
 * @returns 就餐满意度均值
 */
export function computeDiningSatisfactionV13(records: NutritionKitchenRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.diningSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
