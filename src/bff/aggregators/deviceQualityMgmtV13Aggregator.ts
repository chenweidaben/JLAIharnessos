/**
 * 健澜科技 jlmedaios - 设备质量管理 V13 纯函数（M431-B，-quality 后缀避让旧版 medicalDeviceDetailV13（M418））
 *
 * computeDeviceCompletenessRateV13 / computeDeviceFailureRateV13 / computeDeviceUtilizationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 设备质量管理记录 */
export interface DeviceQualityMgmtRecordV13 {
  intact: number;
  failure: number;
  deviceTotal: number;
  actualHours: number;
  requiredHours: number;
}

/**
 * 设备完好率（纯函数）：完好设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 设备质量管理记录列表
 * @returns 设备完好率百分比
 */
export function computeDeviceCompletenessRateV13(records: DeviceQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deviceTotal, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intact, 0);
  return Math.round((intact / total) * 10000) / 100;
}

/**
 * 设备故障率（纯函数，百分率%，反向指标，值越低越好）：故障设备数/设备总数×100，保留 2 位小数。
 *
 * @param records 设备质量管理记录列表
 * @returns 设备故障率百分比
 */
export function computeDeviceFailureRateV13(records: DeviceQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deviceTotal, 0);
  if (total === 0) return 0;
  const failure = records.reduce((acc, r) => acc + r.failure, 0);
  return Math.round((failure / total) * 10000) / 100;
}

/**
 * 设备开机率（纯函数）：实际开机小时数/应开机小时数×100，保留 2 位小数。
 *
 * @param records 设备质量管理记录列表
 * @returns 设备开机率百分比
 */
export function computeDeviceUtilizationRateV13(records: DeviceQualityMgmtRecordV13[]): number {
  const required = records.reduce((acc, r) => acc + r.requiredHours, 0);
  if (required === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualHours, 0);
  return Math.round((actual / required) * 10000) / 100;
}
