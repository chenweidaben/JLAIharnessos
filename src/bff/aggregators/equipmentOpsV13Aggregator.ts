/**
 * 健澜科技 jlmedaios - 设备运维 V13 纯函数（M328-A）
 *
 * countMaintenanceTasksV13 / sumDowntimeHoursV13 / computeMTBFV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备运维记录 */
export interface EquipmentRecordV13 {
  deviceName: string;
  maintenanceCount: number;
  downtimeHours: number;
  totalRuntimeHours: number;
  failureCount: number;
}

/**
 * 本月保养次数（纯函数）：求和。
 *
 * @param records 设备记录列表
 * @returns 保养总次数
 */
export function countMaintenanceTasksV13(records: EquipmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.maintenanceCount, 0);
}

/**
 * 故障停机时长（纯函数）：求和，小时。
 *
 * @param records 设备记录列表
 * @returns 停机总时长
 */
export function sumDowntimeHoursV13(records: EquipmentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.downtimeHours, 0);
}

/**
 * MTBF 平均无故障时间（纯函数）：总运行时间/故障次数。
 *
 * @param records 设备记录列表
 * @returns MTBF（小时）
 */
export function computeMTBFV13(records: EquipmentRecordV13[]): number {
  const totalRuntime = records.reduce((acc, r) => acc + r.totalRuntimeHours, 0);
  const totalFailures = records.reduce((acc, r) => acc + r.failureCount, 0);
  if (totalFailures === 0) return 0;
  return Math.round(totalRuntime / totalFailures);
}
