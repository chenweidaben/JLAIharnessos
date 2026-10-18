/**
 * 健澜科技 jlmedaios - 病历质控权重配置 V14 聚合器（M479-B）
 *
 * 纯函数：权重配置构建 + 权重和校验。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 权重配置项 */
export interface WeightConfigItemV14 {
  dimension: string;
  weight: number;
}

/** 权重配置 */
export interface WeightConfigV14 {
  items: WeightConfigItemV14[];
  sum: number;
}

/** 权重校验结果 */
export interface WeightValidationV14 {
  valid: boolean;
  sum: number;
  issues: string[];
}

/**
 * 构建权重配置。
 *
 * @param items 权重项列表
 * @returns 权重配置
 */
export function buildWeightConfig(items: WeightConfigItemV14[]): WeightConfigV14 {
  const sum = items.reduce((acc, item) => acc + item.weight, 0);
  return { items: [...items], sum };
}

/**
 * 校验权重和：要求 sum===100。
 *
 * @param items 权重项列表
 * @returns 权重校验结果
 */
export function validateWeights(items: WeightConfigItemV14[]): WeightValidationV14 {
  const sum = items.reduce((acc, item) => acc + item.weight, 0);
  const issues: string[] = [];
  if (sum !== 100) {
    issues.push(`权重和为 ${sum}，要求等于 100`);
  }
  if (items.length === 0) {
    issues.push("权重项为空");
  }
  return { valid: sum === 100 && items.length > 0, sum, issues };
}
