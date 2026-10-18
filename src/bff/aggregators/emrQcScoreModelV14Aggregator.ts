/**
 * 健澜科技 jlmedaios - 病历质控评分模型 V14 聚合器（M479-A）
 *
 * 纯函数：评分模型构建 + 加权求和计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评分维度 */
export interface QcScoreDimensionV14 {
  name: string;
  weight: number;
}

/** 评分模型 */
export interface QcScoreModelV14 {
  name: string;
  dimensions: QcScoreDimensionV14[];
}

/**
 * 构建评分模型。
 *
 * @param name 模型名
 * @param dimensions 维度列表
 * @returns 评分模型
 */
export function buildScoreModel(name: string, dimensions: QcScoreDimensionV14[]): QcScoreModelV14 {
  return { name, dimensions: [...dimensions] };
}

/**
 * 加权求和：sum(weight*score)/100。
 *
 * @param model 评分模型
 * @param scores 各维度得分
 * @returns 加权总分（0-100）
 */
export function computeQcScore(
  model: QcScoreModelV14,
  scores: { dimension: string; score: number }[],
): number {
  let total = 0;
  for (const dim of model.dimensions) {
    const scoreEntry = scores.find((s) => s.dimension === dim.name);
    if (scoreEntry) {
      total += (dim.weight * scoreEntry.score) / 100;
    }
  }
  return Math.round(total);
}
