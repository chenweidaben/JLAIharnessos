/**
 * 健澜科技 jlmedaios - 药品效期管理 V13 纯函数（M455-C，药品供应与库存管理组）
 *
 * computeDrugExpiryNearExpiryWarningRateV13 / computeDrugExpiryOverdueWriteOffRateV13 / computeDrugExpiryInspectionCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品效期管理记录 */
export interface DrugExpiryMgmtRecordV13 {
  warned: number;
  totalNearExpiry: number;
  overdue: number;
  totalDrug: number;
  inspected: number;
  totalInspect: number;
}

/**
 * 近效期药品预警率（纯函数）：已预警近效期药品数/近效期药品总数×100，保留 2 位小数。
 *
 * @param records 药品效期管理记录列表
 * @returns 近效期药品预警率百分比
 */
export function computeDrugExpiryNearExpiryWarningRateV13(records: DrugExpiryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalNearExpiry, 0);
  if (total === 0) return 0;
  const warned = records.reduce((acc, r) => acc + r.warned, 0);
  return Math.round((warned / total) * 10000) / 100;
}

/**
 * 过期药品报损率（纯函数，反向指标越低越好）：过期报损药品数/药品总数×100，保留 2 位小数。
 *
 * @param records 药品效期管理记录列表
 * @returns 过期药品报损率百分比
 */
export function computeDrugExpiryOverdueWriteOffRateV13(records: DrugExpiryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDrug, 0);
  if (total === 0) return 0;
  const overdue = records.reduce((acc, r) => acc + r.overdue, 0);
  return Math.round((overdue / total) * 10000) / 100;
}

/**
 * 效期巡检覆盖率（纯函数）：已巡检药品品种数/应巡检药品品种总数×100，保留 2 位小数。
 *
 * @param records 药品效期管理记录列表
 * @returns 效期巡检覆盖率百分比
 */
export function computeDrugExpiryInspectionCoverageRateV13(records: DrugExpiryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalInspect, 0);
  if (total === 0) return 0;
  const inspected = records.reduce((acc, r) => acc + r.inspected, 0);
  return Math.round((inspected / total) * 10000) / 100;
}
