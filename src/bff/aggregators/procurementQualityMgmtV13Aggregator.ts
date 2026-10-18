/**
 * 健澜科技 jlmedaios - 采购质量管理 V13 纯函数（M435-B，-quality 后缀避让旧版采购模块（M408 consumableSupplyMgmtV13 等））
 *
 * computeProcurementTimelinessRateV13 / computeProcurementComplianceRateV13 / computeProcurementSavingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 采购质量管理记录 */
export interface ProcurementQualityMgmtRecordV13 {
  timelyProcurement: number;
  shouldProcurement: number;
  compliantProcurement: number;
  totalProcurement: number;
  savingAmount: number;
  budgetAmount: number;
}

/**
 * 采购及时率（纯函数）：及时采购次数/应采购次数×100，保留 2 位小数。
 *
 * @param records 采购质量管理记录列表
 * @returns 采购及时率百分比
 */
export function computeProcurementTimelinessRateV13(records: ProcurementQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldProcurement, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyProcurement, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 采购合规率（纯函数）：合规采购次数/采购总次数×100，保留 2 位小数。
 *
 * @param records 采购质量管理记录列表
 * @returns 采购合规率百分比
 */
export function computeProcurementComplianceRateV13(records: ProcurementQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalProcurement, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantProcurement, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 采购节约率（纯函数，越高越好）：节约金额/预算采购金额×100，保留 2 位小数。
 *
 * @param records 采购质量管理记录列表
 * @returns 采购节约率百分比
 */
export function computeProcurementSavingRateV13(records: ProcurementQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetAmount, 0);
  if (total === 0) return 0;
  const saving = records.reduce((acc, r) => acc + r.savingAmount, 0);
  return Math.round((saving / total) * 10000) / 100;
}
