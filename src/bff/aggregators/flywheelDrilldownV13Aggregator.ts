/**
 * 健澜科技 jlmedaios - 六维指标明细下钻 V13 纯函数（M306-B）
 *
 * drillDownDimensionV13 / compareDeptDimensionV13 / benchmarkVsIndustryV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 飞轮指标 */
export interface FlywheelMetricsV13 {
  qualityScore: number;
  adoptionRate: number;
  feedbackLoopRate: number;
  pushCtr: number;
  crossDeptDiffusionRate: number;
  assetHealthScore: number;
}

/** 科室得分 */
export interface DeptScoreV13 {
  deptId: string;
  score: number;
}

/** 维度下钻结果 */
export interface DrillDownV13 {
  dimension: keyof FlywheelMetricsV13;
  value: number;
  subMetrics: { label: string; value: number }[];
}

/**
 * 维度下钻（纯函数）：返回该维度的子指标明细。
 *
 * @param dimension 维度名
 * @param metrics 指标
 * @returns 下钻结果
 */
export function drillDownDimensionV13(
  dimension: keyof FlywheelMetricsV13,
  metrics: FlywheelMetricsV13,
): DrillDownV13 {
  const value = metrics[dimension];
  const subMap: Record<keyof FlywheelMetricsV13, { label: string; value: number }[]> = {
    qualityScore: [
      { label: "同行评审通过率", value: Math.round(value * 0.8) },
      { label: "回滚率", value: Math.round(value * 0.2) },
    ],
    adoptionRate: [
      { label: "采纳率", value: value },
      { label: "修改率", value: Math.round(value * 0.3) },
    ],
    feedbackLoopRate: [
      { label: "反馈采集量", value: value },
      { label: "补丁应用率", value: Math.round(value * 0.5) },
    ],
    pushCtr: [
      { label: "曝光", value: 1000 },
      { label: "点击", value: Math.round(1000 * value / 100) },
    ],
    crossDeptDiffusionRate: [
      { label: "广播数", value: 10 },
      { label: "采纳数", value: Math.round(10 * value / 100) },
    ],
    assetHealthScore: [
      { label: "活跃资产", value: value },
      { label: "归档库大小", value: Math.round(value * 0.2) },
    ],
  };
  return { dimension, value, subMetrics: subMap[dimension] };
}

/**
 * 科室间对比（纯函数）：按分数降序。
 *
 * @param deptScores 科室得分
 * @param _dimension 维度（保留参数，便于扩展）
 * @returns 排序后
 */
export function compareDeptDimensionV13(
  deptScores: DeptScoreV13[],
  _dimension: keyof FlywheelMetricsV13,
): DeptScoreV13[] {
  return [...deptScores].sort((a, b) => b.score - a.score);
}

/**
 * 行业对标（纯函数）：高出/低于/持平。
 *
 * @param score 本院得分
 * @param industryBenchmark 行业基准
 * @returns "above" | "below" | "equal"
 */
export function benchmarkVsIndustryV13(score: number, industryBenchmark: number): "above" | "below" | "equal" {
  if (score > industryBenchmark) return "above";
  if (score < industryBenchmark) return "below";
  return "equal";
}
