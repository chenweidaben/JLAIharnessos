/**
 * 健澜科技 jlmedaios - 药品采购管理 V13 纯函数（M455-A，药品供应与库存管理组）
 *
 * computeDrugPurchasePlanCompletionRateV13 / computeDrugPurchaseVolumeBasedProcurementRateV13 / computeDrugPurchaseQualityQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品采购管理记录 */
export interface DrugPurchaseMgmtRecordV13 {
  completed: number;
  totalPlan: number;
  actual: number;
  agreed: number;
  qualified: number;
  totalBatch: number;
}

/**
 * 药品采购计划完成率（纯函数）：已完成采购品种数/采购计划品种总数×100，保留 2 位小数。
 *
 * @param records 药品采购管理记录列表
 * @returns 药品采购计划完成率百分比
 */
export function computeDrugPurchasePlanCompletionRateV13(records: DrugPurchaseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPlan, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 集中带量采购执行率（纯函数）：集采药品实际采购量/集采约定采购量×100，保留 2 位小数。
 *
 * @param records 药品采购管理记录列表
 * @returns 集中带量采购执行率百分比
 */
export function computeDrugPurchaseVolumeBasedProcurementRateV13(records: DrugPurchaseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.agreed, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actual, 0);
  return Math.round((actual / total) * 10000) / 100;
}

/**
 * 采购质量合格率（纯函数）：质量合格批次/采购总批次×100，保留 2 位小数。
 *
 * @param records 药品采购管理记录列表
 * @returns 采购质量合格率百分比
 */
export function computeDrugPurchaseQualityQualifiedRateV13(records: DrugPurchaseMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBatch, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
