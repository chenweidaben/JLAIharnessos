/**
 * 健澜科技 jlmedaios - 设备管理 V13 纯函数（M377-B）
 *
 * computeMedicalEquipmentCountV13 / computeEquipmentGoodRateV13 / computeEquipmentInspectionCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备管理记录 */
export interface EquipmentMgmtRecordV13 {
  equipmentTotalCount: number;
  equipmentGoodCount: number;
  shouldInspectCount: number;
  inspectCompleteCount: number;
}

/**
 * 医疗设备总台数（纯函数）：求和。
 *
 * @param records 设备管理记录列表
 * @returns 医疗设备总台数
 */
export function computeMedicalEquipmentCountV13(records: EquipmentMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.equipmentTotalCount, 0);
}

/**
 * 设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 设备管理记录列表
 * @returns 设备完好率百分比
 */
export function computeEquipmentGoodRateV13(records: EquipmentMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.equipmentTotalCount, 0);
  if (total === 0) return 0;
  const good = records.reduce((acc, r) => acc + r.equipmentGoodCount, 0);
  return Math.round((good / total) * 10000) / 100;
}

/**
 * 设备巡检完成率（纯函数）：完成数/应巡检数×100，保留 2 位小数。
 *
 * @param records 设备管理记录列表
 * @returns 设备巡检完成率百分比
 */
export function computeEquipmentInspectionCompletionRateV13(records: EquipmentMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldInspectCount, 0);
  if (should === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.inspectCompleteCount, 0);
  return Math.round((complete / should) * 10000) / 100;
}
