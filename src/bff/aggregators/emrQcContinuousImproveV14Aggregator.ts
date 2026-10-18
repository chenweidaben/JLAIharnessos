/**
 * 健澜科技 jlmedaios - 病历质控持续改进 V14 聚合器（M479-D，M479 收官）
 *
 * 纯函数：改进计划构建 + 改进进度跟踪。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 改进计划 */
export interface ImprovementPlanV14 {
  defect: string;
  measure: string;
  owner: string;
}

/** 改进进度结果 */
export interface ImprovementProgressV14 {
  progress: number;
  status: string;
}

/**
 * 构建改进计划。
 *
 * @param defect 缺陷描述
 * @param measure 改进措施
 * @param owner 责任人
 * @returns 改进计划
 */
export function buildImprovementPlan(defect: string, measure: string, owner: string): ImprovementPlanV14 {
  return { defect, measure, owner };
}

/**
 * 跟踪改进进度：progress = completedSteps/totalSteps×100（整数）。
 *
 * 规则：progress=100 → '已完成'；>0 且 <100 → '进行中'；=0 → '未开始'。
 *
 * @param plan 改进计划（占位参数，保持函数签名稳定）
 * @param completedSteps 已完成步数
 * @param totalSteps 总步数
 * @returns 改进进度结果
 */
export function trackImprovementProgress(
  _plan: ImprovementPlanV14,
  completedSteps: number,
  totalSteps: number,
): ImprovementProgressV14 {
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  let status: string;
  if (progress >= 100) {
    status = "已完成";
  } else if (progress > 0) {
    status = "进行中";
  } else {
    status = "未开始";
  }
  return { progress, status };
}
