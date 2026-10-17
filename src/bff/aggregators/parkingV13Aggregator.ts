/**
 * 健澜科技 jlmedaios - 停车场使用率 V13 纯函数（M331-D）
 *
 * computeParkingUtilizationV13 / computeParkingTurnoverV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 停车场 */
export interface ParkingLotV13 {
  totalSpaces: number;
  usedSpaces: number;
  parkingCount: number;
}

/**
 * 车位使用率（纯函数）：已使用/总数×100。
 *
 * @param parking 停车场列表
 * @returns 使用率百分比
 */
export function computeParkingUtilizationV13(parking: ParkingLotV13[]): number {
  const total = parking.reduce((acc, p) => acc + p.totalSpaces, 0);
  const used = parking.reduce((acc, p) => acc + p.usedSpaces, 0);
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * 车位周转率（纯函数）：停车次数/总车位。
 *
 * @param parking 停车场列表
 * @returns 周转率
 */
export function computeParkingTurnoverV13(parking: ParkingLotV13[]): number {
  const totalSpaces = parking.reduce((acc, p) => acc + p.totalSpaces, 0);
  const totalParking = parking.reduce((acc, p) => acc + p.parkingCount, 0);
  if (totalSpaces === 0) return 0;
  return Math.round((totalParking / totalSpaces) * 10) / 10;
}
