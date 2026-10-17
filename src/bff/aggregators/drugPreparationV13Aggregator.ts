/**
 * 健澜科技 jlmedaios - 制剂管理 V13 纯函数（M380-A）
 *
 * computeInhousePreparationVarietyCountV13 / computePreparationQualifiedRateV13 / computeMonthlyPreparationOutputV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 制剂管理记录 */
export interface DrugPreparationRecordV13 {
  preparationVarietyCount: number;
  testBatchCount: number;
  qualifiedBatchCount: number;
  monthlyOutput: number;
}

/**
 * 院内制剂品种数（纯函数）：求和。
 *
 * @param records 制剂管理记录列表
 * @returns 院内制剂品种数
 */
export function computeInhousePreparationVarietyCountV13(records: DrugPreparationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.preparationVarietyCount, 0);
}

/**
 * 制剂合格率（纯函数）：合格批次数/检验总批次数×100，保留 2 位小数。
 *
 * @param records 制剂管理记录列表
 * @returns 制剂合格率百分比
 */
export function computePreparationQualifiedRateV13(records: DrugPreparationRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.testBatchCount, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedBatchCount, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 制剂月产量（纯函数）：求和，单位瓶/袋。
 *
 * @param records 制剂管理记录列表
 * @returns 制剂月产量
 */
export function computeMonthlyPreparationOutputV13(records: DrugPreparationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.monthlyOutput, 0);
}
