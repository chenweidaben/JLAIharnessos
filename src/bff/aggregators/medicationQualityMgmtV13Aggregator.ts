/**
 * 健澜科技 jlmedaios - 药事质量管理 V13 纯函数（M431-A，-quality 后缀避让旧版 pharmacyDetailV13（M418））
 *
 * computeMedicationPrescriptionPassRateV13 / computeMedicationInventoryTurnoverRateV13 / computeMedicationInventoryVarianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药事质量管理记录 */
export interface MedicationQualityMgmtRecordV13 {
  prescriptionPass: number;
  prescriptionTotal: number;
  totalCost: number;
  avgInventory: number;
  varianceVarieties: number;
  totalVarieties: number;
}

/**
 * 处方合格率（纯函数）：合格处方数/处方总数×100，保留 2 位小数。
 *
 * @param records 药事质量管理记录列表
 * @returns 处方合格率百分比
 */
export function computeMedicationPrescriptionPassRateV13(records: MedicationQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.prescriptionTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.prescriptionPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 药品库存周转率（纯函数，比值类，单位次，越高越好）：药品消耗总成本/平均库存金额，保留 2 位小数。
 *
 * @param records 药事质量管理记录列表
 * @returns 药品库存周转率（次）
 */
export function computeMedicationInventoryTurnoverRateV13(records: MedicationQualityMgmtRecordV13[]): number {
  const avgInv = records.reduce((acc, r) => acc + r.avgInventory, 0);
  if (avgInv === 0) return 0;
  const cost = records.reduce((acc, r) => acc + r.totalCost, 0);
  return Math.round((cost / avgInv) * 100) / 100;
}

/**
 * 药品盘点差异率（纯函数，百分率%，反向指标，值越低越好）：差异品种数/盘点品种总数×100，保留 2 位小数。
 *
 * @param records 药事质量管理记录列表
 * @returns 药品盘点差异率百分比
 */
export function computeMedicationInventoryVarianceRateV13(records: MedicationQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalVarieties, 0);
  if (total === 0) return 0;
  const variance = records.reduce((acc, r) => acc + r.varianceVarieties, 0);
  return Math.round((variance / total) * 10000) / 100;
}
