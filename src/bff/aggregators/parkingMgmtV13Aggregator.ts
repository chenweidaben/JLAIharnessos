/**
 * 健澜科技 jlmedaios - 车辆管理 V13 纯函数（M352-D，M352 收官）
 *
 * computeParkingOccupancyRateV13 / computeEmergencyVehicleWaitMinutesV13 / computeVisitorRegisterRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 车辆管理记录 */
export interface ParkingMgmtRecordV13 {
  usedParkingCount: number;
  totalParkingCount: number;
  emergencyWaitMinutes: number;
  visitorRegisteredCount: number;
  visitorTotalCount: number;
}

/**
 * 车位使用率（纯函数）：已用/总车位×100，保留 2 位小数。
 *
 * @param records 车辆管理记录列表
 * @returns 车位使用率百分比
 */
export function computeParkingOccupancyRateV13(records: ParkingMgmtRecordV13[]): number {
  const used = records.reduce((acc, r) => acc + r.usedParkingCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalParkingCount, 0);
  if (total === 0) return 0;
  return Math.round((used / total) * 10000) / 100;
}

/**
 * 急诊车辆等待时长（纯函数）：均值，保留 2 位小数，单位分钟。
 *
 * @param records 车辆管理记录列表
 * @returns 急诊车辆等待时长（分钟）
 */
export function computeEmergencyVehicleWaitMinutesV13(records: ParkingMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.emergencyWaitMinutes, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 访客登记率（纯函数）：登记数/访客总数×100，保留 2 位小数。
 *
 * @param records 车辆管理记录列表
 * @returns 访客登记率百分比
 */
export function computeVisitorRegisterRateV13(records: ParkingMgmtRecordV13[]): number {
  const registered = records.reduce((acc, r) => acc + r.visitorRegisteredCount, 0);
  const total = records.reduce((acc, r) => acc + r.visitorTotalCount, 0);
  if (total === 0) return 0;
  return Math.round((registered / total) * 10000) / 100;
}
