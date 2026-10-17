/**
 * 健澜科技 jlmedaios - 设备维护统计 V13 纯函数（M385-B，stats 避让）
 *
 * computeEquipmentInspectionCountV13 / computeAvgFaultResponseHoursV13 / computeEquipmentGoodRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备维护统计记录 */
export interface EquipmentMaintenanceRecordV13 {
  inspectionCount: number;
  totalResponseHours: number;
  faultCount: number;
  goodCount: number;
  totalCount: number;
}

/**
 * 设备巡检次数（纯函数）：求和。
 *
 * @param records 设备维护统计记录列表
 * @returns 设备巡检次数
 */
export function computeEquipmentInspectionCountV13(records: EquipmentMaintenanceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inspectionCount, 0);
}

/**
 * 故障响应时长（纯函数）：总响应小时数/故障数，保留 2 位小数。
 *
 * @param records 设备维护统计记录列表
 * @returns 故障响应时长（小时）
 */
export function computeAvgFaultResponseHoursV13(records: EquipmentMaintenanceRecordV13[]): number {
  const faults = records.reduce((acc, r) => acc + r.faultCount, 0);
  if (faults === 0) return 0;
  const hours = records.reduce((acc, r) => acc + r.totalResponseHours, 0);
  return Math.round((hours / faults) * 100) / 100;
}

/**
 * 设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 设备维护统计记录列表
 * @returns 设备完好率百分比
 */
export function computeEquipmentGoodRateV13(records: EquipmentMaintenanceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const good = records.reduce((acc, r) => acc + r.goodCount, 0);
  return Math.round((good / total) * 10000) / 100;
}
