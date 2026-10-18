/**
 * 健澜科技 jlmedaios - 质控时效统计 V14 聚合器（M500-C）
 *
 * 纯函数：时效统计构建 + 统计聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时效统计 */
export interface TimelinessStatV14 {
  dept: string;
  avgHours: number;
}

/** 聚合结果 */
export interface TimelinessAggregateV14 {
  avgHours: number;
  depts: number;
}

/**
 * 构建时效统计。
 *
 * @param dept 科室
 * @param avgHours 平均完成耗时（小时）
 * @returns 时效统计
 */
export function buildTimelinessStat(dept: string, avgHours: number): TimelinessStatV14 {
  return { dept, avgHours };
}

/**
 * 聚合时效统计（全院平均耗时 + 科室数）。
 *
 * @param stats 时效统计数组
 * @returns 聚合结果
 */
export function aggregateTimelinessStat(stats: TimelinessStatV14[]): TimelinessAggregateV14 {
  // 手算 avgHours：各科室耗时之和 / 科室数，保留 1 位小数
  if (stats.length === 0) {
    return { avgHours: 0, depts: 0 };
  }
  const sum = stats.reduce((acc, s) => acc + s.avgHours, 0);
  const avgHours = Math.round((sum / stats.length) * 10) / 10;
  return { avgHours, depts: stats.length };
}
