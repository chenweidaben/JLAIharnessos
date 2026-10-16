/**
 * 健澜科技 jlmedaios - 后勤基建 V2 纯函数（M220-A）
 *
 * buildLogisticsReportV2 / assessLogisticsEfficiency / calculateEnergyConsumption
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估后勤效率（纯函数）。
 *
 * @param responseTime 响应时间（分钟）
 * @param completionRate 完成率（0-1）
 * @returns 效率等级
 */
export function assessLogisticsEfficiency(responseTime: number, completionRate: number): { level: string; score: number } {
  const score = Math.round((completionRate * 100) / Math.max(responseTime / 10, 1));
  let level = '一般';
  if (score >= 80) level = '优秀';
  else if (score < 40) level = '待改进';
  return { level, score };
}

/**
 * 计算能耗（纯函数）。
 *
 * @param area 面积（平方米）
 * @param usage 单位面积能耗
 * @returns 总能耗
 */
export function calculateEnergyConsumption(area: number, usage: number): { total: number } {
  return { total: area * usage };
}

/** 后勤基建 V2 报告输出 */
export interface LogisticsReportV2 {
  timeRange: string;
  property: { workOrders: number; completed: number };
  utilities: { oxygen: boolean; vacuum: boolean; compressedAir: boolean };
  linen: { processed: number };
  food: { meals: number };
  construction: { projects: number };
  space: { occupied: number };
  equipment: { assets: number };
  smart: { iot: boolean };
  suggestions: string[];
}

/**
 * 构建后勤基建 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 后勤基建 V2 报告
 */
export function buildLogisticsReportV2(timeRange: string): LogisticsReportV2 {
  return {
    timeRange,
    property: { workOrders: 500, completed: 480 },
    utilities: { oxygen: true, vacuum: true, compressedAir: true },
    linen: { processed: 10000 },
    food: { meals: 50000 },
    construction: { projects: 5 },
    space: { occupied: 80000 },
    equipment: { assets: 1000 },
    smart: { iot: true },
    suggestions: ['推广智慧后勤工单', '加强能耗监测'],
  };
}
