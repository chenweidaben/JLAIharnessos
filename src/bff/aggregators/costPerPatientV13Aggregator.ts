/**
 * 健澜科技 jlmedaios - 单病种成本 V13 纯函数（M329-B）
 *
 * computeTop5DiseaseCostV13 / computeDrugRatioV13 / computeConsumableRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病种成本 */
export interface DiseaseCostV13 {
  diseaseName: string;
  totalCost: number;
  drugCost: number;
  consumableCost: number;
}

/** 病种成本项 */
export interface DiseaseCostItemV13 {
  diseaseName: string;
  totalCost: number;
}

/**
 * Top5 病种例均费用（纯函数）：按费用降序取前 5。
 *
 * @param diseases 病种列表
 * @returns Top5 病种
 */
export function computeTop5DiseaseCostV13(diseases: DiseaseCostV13[]): DiseaseCostItemV13[] {
  return [...diseases]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5)
    .map((d) => ({ diseaseName: d.diseaseName, totalCost: d.totalCost }));
}

/**
 * 药占比（纯函数）：药品费用/总费用×100。
 *
 * @param disease 病种成本
 * @returns 药占比百分比
 */
export function computeDrugRatioV13(disease: DiseaseCostV13): number {
  if (disease.totalCost === 0) return 0;
  return Math.round((disease.drugCost / disease.totalCost) * 100);
}

/**
 * 耗占比（纯函数）：耗材费用/总费用×100。
 *
 * @param disease 病种成本
 * @returns 耗占比百分比
 */
export function computeConsumableRatioV13(disease: DiseaseCostV13): number {
  if (disease.totalCost === 0) return 0;
  return Math.round((disease.consumableCost / disease.totalCost) * 100);
}
