/**
 * 健澜科技 jlmedaios - 电子病历等级评审仪表盘 V14 聚合器（M462-D，M462 收官）
 *
 * 纯函数：四项指标加权平均（各 25% 权重）+ 等级判定。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 等级评审指标 */
export interface GradeMetricsV14 {
  structuredRate: number;
  closedLoopRate: number;
  sharingRate: number;
  qcCoverageRate: number;
}

/** 进度项 */
export interface GradeProgressItemV14 {
  key: string;
  label: string;
  value: number;
}

/** 进度计算结果 */
export interface GradeProgressV14 {
  overall: number;
  items: GradeProgressItemV14[];
}

/**
 * 计算整体进度（四项指标平均，各 25% 权重，保留 2 位小数）。
 *
 * @param metrics 四项指标
 * @returns overall + items
 */
export function computeGradeProgress(metrics: GradeMetricsV14): GradeProgressV14 {
  const items: GradeProgressItemV14[] = [
    { key: "structuredRate", label: "结构化率", value: metrics.structuredRate },
    { key: "closedLoopRate", label: "闭环率", value: metrics.closedLoopRate },
    { key: "sharingRate", label: "共享率", value: metrics.sharingRate },
    { key: "qcCoverageRate", label: "质控覆盖率", value: metrics.qcCoverageRate },
  ];
  const avg = (metrics.structuredRate + metrics.closedLoopRate + metrics.sharingRate + metrics.qcCoverageRate) / 4;
  const overall = Math.round(avg * 100) / 100;
  return { overall, items };
}

/**
 * 根据总分判定等级。
 *
 * @param overall 整体进度（0-100）
 * @returns 等级字符串（6级/5级/4级/3级/2级）
 */
export function getGradeLevel(overall: number): string {
  if (overall >= 90) return "6级";
  if (overall >= 70) return "5级";
  if (overall >= 60) return "4级";
  if (overall >= 40) return "3级";
  return "2级";
}
