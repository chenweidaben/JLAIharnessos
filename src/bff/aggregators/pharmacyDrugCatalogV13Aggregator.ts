/**
 * 健澜科技 jlmedaios - 药品目录 V13 纯函数（M406-B）
 *
 * computeBasicDrugCatalogRatioV13 / computeCentralizedProcurementDrugEquipRateV13 / computeKeyMonitoredDrugRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品目录记录 */
export interface PharmacyDrugCatalogRecordV13 {
  basicDrug: number;
  totalCatalog: number;
  equipped: number;
  shouldEquip: number;
  monitored: number;
}

/**
 * 基本药物目录占比（纯函数）：基本药物品种数/药品目录总品种数×100，保留 2 位小数。
 *
 * @param records 药品目录记录列表
 * @returns 基本药物目录占比百分比
 */
export function computeBasicDrugCatalogRatioV13(records: PharmacyDrugCatalogRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCatalog, 0);
  if (total === 0) return 0;
  const basic = records.reduce((acc, r) => acc + r.basicDrug, 0);
  return Math.round((basic / total) * 10000) / 100;
}

/**
 * 集采药品配备率（纯函数）：已配备集采药品数/应配备集采药品数×100，保留 2 位小数。
 *
 * @param records 药品目录记录列表
 * @returns 集采药品配备率百分比
 */
export function computeCentralizedProcurementDrugEquipRateV13(records: PharmacyDrugCatalogRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldEquip, 0);
  if (total === 0) return 0;
  const equipped = records.reduce((acc, r) => acc + r.equipped, 0);
  return Math.round((equipped / total) * 10000) / 100;
}

/**
 * 重点监控药品占比（纯函数）：重点监控药品品种数/药品目录总品种数×100，保留 2 位小数。
 *
 * @param records 药品目录记录列表
 * @returns 重点监控药品占比百分比
 */
export function computeKeyMonitoredDrugRatioV13(records: PharmacyDrugCatalogRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCatalog, 0);
  if (total === 0) return 0;
  const monitored = records.reduce((acc, r) => acc + r.monitored, 0);
  return Math.round((monitored / total) * 10000) / 100;
}
