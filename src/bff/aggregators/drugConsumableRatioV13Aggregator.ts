/**
 * 健澜科技 jlmedaios - 药耗占比 V13 纯函数（M356-C）
 *
 * computeDrugRatioV13 / computeConsumableRatioV13 / computeLabExamRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药耗占比记录 */
export interface DrugConsumableRatioRecordV13 {
  drugRevenue: number;
  consumableRevenue: number;
  labExamRevenue: number;
  medicalRevenue: number;
}

/**
 * 药占比（纯函数）：药品收入/医疗收入×100，保留 2 位小数。
 *
 * @param records 药耗占比记录列表
 * @returns 药占比百分比
 */
export function computeDrugRatioV13(records: DrugConsumableRatioRecordV13[]): number {
  const drug = records.reduce((acc, r) => acc + r.drugRevenue, 0);
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  return Math.round((drug / medical) * 10000) / 100;
}

/**
 * 耗占比（纯函数）：耗材收入/医疗收入×100，保留 2 位小数。
 *
 * @param records 药耗占比记录列表
 * @returns 耗占比百分比
 */
export function computeConsumableRatioV13(records: DrugConsumableRatioRecordV13[]): number {
  const consumable = records.reduce((acc, r) => acc + r.consumableRevenue, 0);
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  return Math.round((consumable / medical) * 10000) / 100;
}

/**
 * 检查检验收入占比（纯函数）：检查检验收入/医疗收入×100，保留 2 位小数。
 *
 * @param records 药耗占比记录列表
 * @returns 检查检验收入占比百分比
 */
export function computeLabExamRatioV13(records: DrugConsumableRatioRecordV13[]): number {
  const labExam = records.reduce((acc, r) => acc + r.labExamRevenue, 0);
  const medical = records.reduce((acc, r) => acc + r.medicalRevenue, 0);
  if (medical === 0) return 0;
  return Math.round((labExam / medical) * 10000) / 100;
}
