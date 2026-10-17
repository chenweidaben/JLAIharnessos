/**
 * 健澜科技 jlmedaios - 医疗设备管理（细节）V13 纯函数（M418-B，detail 避让旧版 equipmentMgmtV13/consumableSupplyV13）
 *
 * computeEquipmentInspectionCompletionRateV13 / computeEquipmentRepairTimelyRateV13 / computeEquipmentCalibrationPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗设备管理（细节）记录 */
export interface MedicalEquipmentMgmtDetailRecordV13 {
  inspectionDone: number;
  shouldInspectTotal: number;
  repairTimely: number;
  repairTotal: number;
  calibrationQualified: number;
  calibrationTotal: number;
}

/**
 * 设备巡检完成率（纯函数）：已完成巡检数/应巡检设备总数×100，保留 2 位小数。
 *
 * @param records 医疗设备管理（细节）记录列表
 * @returns 设备巡检完成率百分比
 */
export function computeEquipmentInspectionCompletionRateV13(records: MedicalEquipmentMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldInspectTotal, 0);
  if (total === 0) return 0;
  const inspectionDone = records.reduce((acc, r) => acc + r.inspectionDone, 0);
  return Math.round((inspectionDone / total) * 10000) / 100;
}

/**
 * 设备故障维修及时率（纯函数）：及时维修台次/故障维修总台次×100，保留 2 位小数。
 *
 * @param records 医疗设备管理（细节）记录列表
 * @returns 设备故障维修及时率百分比
 */
export function computeEquipmentRepairTimelyRateV13(records: MedicalEquipmentMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.repairTotal, 0);
  if (total === 0) return 0;
  const repairTimely = records.reduce((acc, r) => acc + r.repairTimely, 0);
  return Math.round((repairTimely / total) * 10000) / 100;
}

/**
 * 设备计量合格率（纯函数）：合格设备数/计量设备总数×100，保留 2 位小数。
 *
 * @param records 医疗设备管理（细节）记录列表
 * @returns 设备计量合格率百分比
 */
export function computeEquipmentCalibrationPassRateV13(records: MedicalEquipmentMgmtDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.calibrationTotal, 0);
  if (total === 0) return 0;
  const calibrationQualified = records.reduce((acc, r) => acc + r.calibrationQualified, 0);
  return Math.round((calibrationQualified / total) * 10000) / 100;
}
