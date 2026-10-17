/**
 * 健澜科技 jlmedaios - 床位占用预测 V13 纯函数（M312-A）
 *
 * forecastBedOccupancyV13 / assessBedTensionV13 / identifyBedCrisisV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病区床位 */
export interface DeptBedV13 {
  deptId: string;
  deptName: string;
  currentOccupancy: number;
}

/** 病区预测结果 */
export interface DeptForecastV13 {
  deptId: string;
  deptName: string;
  occupancySeries: number[];
  avgOccupancy: number;
}

/**
 * 床位占用预测（纯函数）：未来 N 天占用率预测（基于当前占用率做平稳外推）。
 *
 * @param departments 病区列表
 * @param days 预测天数
 * @returns 各病区预测
 */
export function forecastBedOccupancyV13(
  departments: DeptBedV13[],
  days: number,
): DeptForecastV13[] {
  return departments.map((d) => {
    const occupancySeries = Array.from({ length: days }, () => d.currentOccupancy);
    return {
      deptId: d.deptId,
      deptName: d.deptName,
      occupancySeries,
      avgOccupancy: d.currentOccupancy,
    };
  });
}

/**
 * 床位紧张灯色（纯函数）：≥90% 红灯 / 75-90% 黄灯 / <75% 绿灯。
 *
 * @param occupancyRate 占用率
 * @returns 灯色
 */
export function assessBedTensionV13(occupancyRate: number): string {
  if (occupancyRate >= 90) return "红灯";
  if (occupancyRate >= 75) return "黄灯";
  return "绿灯";
}

/**
 * 床位紧张病区列表（纯函数）：红灯病区。
 *
 * @param forecast 预测结果
 * @returns 红灯病区
 */
export function identifyBedCrisisV13(forecast: DeptForecastV13[]): DeptForecastV13[] {
  return forecast.filter((f) => assessBedTensionV13(f.avgOccupancy) === "红灯");
}
