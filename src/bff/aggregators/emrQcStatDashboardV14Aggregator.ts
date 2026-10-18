/**
 * 健澜科技 jlmedaios - 质控综合统计大屏 V14 聚合器（M500-D，M500 收官里程碑）
 *
 * 纯函数：综合统计大屏构建 + 所有统计数据聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 综合统计大屏 */
export interface StatDashboardV14 {
  defectTotal: number;
  passRate: number;
  avgHours: number;
}

/**
 * 构建综合统计大屏。
 *
 * @param defectTotal 缺陷总数
 * @param passRate 合格率（%）
 * @param avgHours 平均完成耗时（小时）
 * @returns 综合统计大屏
 */
export function buildStatDashboard(defectTotal: number, passRate: number, avgHours: number): StatDashboardV14 {
  return { defectTotal, passRate, avgHours };
}

/**
 * 聚合所有统计数据。
 *
 * @param defects 缺陷总数
 * @param passCount 合格数
 * @param passTotal 总数
 * @param hours 平均耗时
 * @returns 综合统计大屏
 */
export function aggregateAllStats(
  defects: number,
  passCount: number,
  passTotal: number,
  hours: number,
): StatDashboardV14 {
  // 手算 passRate：Math.ceil(passCount/passTotal×100)，分母不能为 0
  const passRate = passTotal > 0 ? Math.ceil((passCount / passTotal) * 100) : 0;
  return {
    defectTotal: defects,
    passRate,
    avgHours: hours,
  };
}
