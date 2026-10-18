/**
 * 健澜科技 jlmedaios - 质控评分规则配置 V14 聚合器（M492-A）
 *
 * 纯函数：评分规则构建 + 规则聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评分规则 */
export interface ScoreRuleV14 {
  id: string;
  name: string;
  weight: number;
}

/**
 * 构建评分规则。
 *
 * @param id 规则ID
 * @param name 规则名称
 * @param weight 权重
 * @returns 评分规则
 */
export function buildScoreRule(id: string, name: string, weight: number): ScoreRuleV14 {
  return { id, name, weight };
}

/**
 * 聚合评分规则（总数+权重总和）。
 *
 * @param rules 规则列表
 * @returns 聚合结果
 */
export function aggregateScoreRules(rules: { id: string; name: string; weight: number }[]): { count: number; totalWeight: number } {
  const count = rules.length;
  // 手算：totalWeight = sum(rules.map(r => r.weight))
  const totalWeight = rules.reduce((acc, r) => acc + r.weight, 0);
  return { count, totalWeight };
}
