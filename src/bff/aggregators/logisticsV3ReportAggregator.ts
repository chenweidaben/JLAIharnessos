/**
 * 健澜科技 jlmedaios - 后勤保障 V3 纯函数（M243-A）
 *
 * buildLogisticsV3Report / assessLogisticsEfficiencyV3 / calculateEnergyV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估后勤效率 V3（纯函数）。
 *
 * @param responseTime 响应时间(分钟)
 * @param completionRate 完成率(%)
 * @returns 效率
 */
export function assessLogisticsEfficiencyV3(responseTime: number, completionRate: number): { responseTime: number; completionRate: number; excellent: boolean } {
  return {
    responseTime,
    completionRate,
    excellent: responseTime <= 15 && completionRate >= 95,
  };
}

/**
 * 计算能耗 V3（纯函数）。
 *
 * @param area 面积(㎡)
 * @param usage 用量
 * @returns 能耗
 */
export function calculateEnergyV3(area: number, usage: { kwh: number; water: number; gas: number }): { kwhPerSqm: number; waterPerSqm: number; gasPerSqm: number } {
  return {
    kwhPerSqm: Math.round((usage.kwh / area) * 100) / 100,
    waterPerSqm: Math.round((usage.water / area) * 100) / 100,
    gasPerSqm: Math.round((usage.gas / area) * 100) / 100,
  };
}

/** 后勤保障 V3 报告输出 */
export interface LogisticsV3Report {
  timeRange: string;
  property: { cleaning: number; greening: number; parking: number; elevator: number };
  utility: { water: number; power: number; oxygen: number; vacuum: number };
  linen: number;
  meal: number;
  workOrder: { total: number; completed: number };
  suggestions: string[];
}

/**
 * 构建后勤保障 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 后勤保障 V3 报告
 */
export function buildLogisticsV3Report(timeRange: string): LogisticsV3Report {
  return {
    timeRange,
    property: { cleaning: 100, greening: 50, parking: 2000, elevator: 30 },
    utility: { water: 100000, power: 500000, oxygen: 100, vacuum: 80 },
    linen: 50000,
    meal: 30000,
    workOrder: { total: 2000, completed: 1900 },
    suggestions: ["降低能耗", "提高工单完成率"],
  };
}
