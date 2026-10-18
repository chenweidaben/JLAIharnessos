/**
 * 健澜科技 jlmedaios - 设备维护保养管理 V13 纯函数（M449-B，医疗装备与设备管理组）
 *
 * computeEquipmentMaintenancePreventivePlanCompletionRateV13 / computeEquipmentMaintenanceDowntimeRateV13 / computeEquipmentMaintenanceRepairTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备维护保养管理记录 */
export interface EquipmentMaintenanceMgmtRecordV13 {
  preventiveDone: number;
  preventivePlanned: number;
  downtimeHours: number;
  totalHours: number;
  repairTimely: number;
  totalFault: number;
}

/**
 * 预防性保养计划完成率（纯函数）：已完成预防性保养次数/预防性保养计划次数×100，保留 2 位小数。
 *
 * @param records 设备维护保养管理记录列表
 * @returns 预防性保养计划完成率百分比
 */
export function computeEquipmentMaintenancePreventivePlanCompletionRateV13(records: EquipmentMaintenanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.preventivePlanned, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.preventiveDone, 0);
  return Math.round((done / total) * 10000) / 100;
}

/**
 * 设备故障停机率（纯函数，反向指标越低越好）：故障停机时长/设备总运行时长×100，保留 2 位小数。
 *
 * @param records 设备维护保养管理记录列表
 * @returns 设备故障停机率百分比
 */
export function computeEquipmentMaintenanceDowntimeRateV13(records: EquipmentMaintenanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalHours, 0);
  if (total === 0) return 0;
  const downtime = records.reduce((acc, r) => acc + r.downtimeHours, 0);
  return Math.round((downtime / total) * 10000) / 100;
}

/**
 * 设备维修及时率（纯函数）：及时维修设备数/故障设备总数×100，保留 2 位小数。
 *
 * @param records 设备维护保养管理记录列表
 * @returns 设备维修及时率百分比
 */
export function computeEquipmentMaintenanceRepairTimelinessRateV13(records: EquipmentMaintenanceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFault, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.repairTimely, 0);
  return Math.round((timely / total) * 10000) / 100;
}
