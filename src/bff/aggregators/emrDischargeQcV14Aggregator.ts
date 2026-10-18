/**
 * 健澜科技 jlmedaios - 出院病历质控 V14 聚合器（M481-C）
 *
 * 纯函数：出院病历就绪度检查 + 出院得分计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院病历检查项 */
export interface DischargeItemV14 {
  name: string;
  completed: boolean;
}

/** 出院病历质控结果 */
export interface DischargeQcResultV14 {
  completedCount: number;
  total: number;
  incompleteItems: string[];
}

/**
 * 出院病历就绪度检查：统计已完成/未完成项。
 *
 * @param items 检查项列表
 * @returns 质控结果
 */
export function checkDischargeReadiness(items: DischargeItemV14[]): DischargeQcResultV14 {
  const completedCount = items.filter((i) => i.completed).length;
  const incompleteItems = items.filter((i) => !i.completed).map((i) => i.name);
  return { completedCount, total: items.length, incompleteItems };
}

/**
 * 计算出院病历得分：completedCount/total×100（整数）。
 *
 * @param result 质控结果
 * @returns 得分（0-100）
 */
export function computeDischargeScore(result: { completedCount: number; total: number }): number {
  if (result.total === 0) return 0;
  return Math.round((result.completedCount / result.total) * 100);
}
