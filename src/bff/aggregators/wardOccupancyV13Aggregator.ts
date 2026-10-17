/**
 * 健澜科技 jlmedaios - 病房床位使用率 V13 纯函数（M331-A）
 *
 * computeWardOccupancyV13 / computeOverallOccupancyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病区床位 */
export interface WardOccupancyV13 {
  wardName: string;
  occupiedBedDays: number;
  availableBedDays: number;
}

/** 病区使用率项 */
export interface WardOccupancyItemV13 {
  wardName: string;
  occupancyRate: number;
}

/**
 * 各病区床位使用率（纯函数）：实际占用床日/开放床日×100。
 *
 * @param wards 病区列表
 * @returns 各病区使用率
 */
export function computeWardOccupancyV13(wards: WardOccupancyV13[]): WardOccupancyItemV13[] {
  return wards.map((w) => ({
    wardName: w.wardName,
    occupancyRate: w.availableBedDays === 0 ? 0 : Math.round((w.occupiedBedDays / w.availableBedDays) * 100),
  }));
}

/**
 * 全院平均床位使用率（纯函数）：总占用/总开放×100。
 *
 * @param wards 病区列表
 * @returns 全院平均使用率
 */
export function computeOverallOccupancyV13(wards: WardOccupancyV13[]): number {
  const totalOccupied = wards.reduce((acc, w) => acc + w.occupiedBedDays, 0);
  const totalAvailable = wards.reduce((acc, w) => acc + w.availableBedDays, 0);
  if (totalAvailable === 0) return 0;
  return Math.round((totalOccupied / totalAvailable) * 100);
}
