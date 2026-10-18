/**
 * 健澜科技 jlmedaios - 质控科室对比雷达图 V14 聚合器（M506-B）
 *
 * 纯函数：雷达图构建 + 雷达图聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 雷达图维度 */
export interface RadarDimensionV14 {
  name: string;
  score: number;
}

/** 雷达图 */
export interface RadarChartV14 {
  dept: string;
  dimensions: RadarDimensionV14[];
}

/** 雷达图聚合结果 */
export interface RadarAggregateV14 {
  dept: string;
  avgScore: number;
  totalDims: number;
}

/**
 * 构建雷达图。
 *
 * @param dept 科室
 * @param dimensions 维度数组
 * @returns 雷达图
 */
export function buildRadarChart(dept: string, dimensions: RadarDimensionV14[]): RadarChartV14 {
  return { dept, dimensions };
}

/**
 * 聚合雷达图（科室 + 平均分 + 维度数）。
 *
 * @param chart 雷达图
 * @returns 聚合结果
 */
export function aggregateRadarChart(chart: RadarChartV14): RadarAggregateV14 {
  if (chart.dimensions.length === 0) {
    return { dept: chart.dept, avgScore: 0, totalDims: 0 };
  }
  // 手算聚合：avgScore=Math.round(sum/scores.length)，totalDims=dimensions.length
  const sum = chart.dimensions.reduce((acc, d) => acc + d.score, 0);
  const avgScore = Math.round(sum / chart.dimensions.length);
  return { dept: chart.dept, avgScore, totalDims: chart.dimensions.length };
}
