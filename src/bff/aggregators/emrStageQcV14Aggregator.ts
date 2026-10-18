/**
 * 健澜科技 jlmedaios - 环节质控 V14 聚合器（M481-B）
 *
 * 纯函数：环节质控记录构建 + 环节质量评分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 环节质控记录 */
export interface StageQcV14 {
  stageName: string;
  dept: string;
}

/** 环节质控项 */
export interface StageQcItemV14 {
  name: string;
  score: number;
}

/** 环节质量评分结果 */
export interface StageQualityResultV14 {
  avgScore: number;
  passed: boolean;
}

/**
 * 构建环节质控记录。
 *
 * @param stageName 环节名
 * @param dept 科室
 * @returns 环节质控记录
 */
export function buildStageQc(stageName: string, dept: string): StageQcV14 {
  return { stageName, dept };
}

/**
 * 环节质量评分：avg=sum/count 保留 1 位小数，>=80 通过。
 *
 * @param items 评分项列表
 * @returns 评分结果
 */
export function evaluateStageQuality(items: StageQcItemV14[]): StageQualityResultV14 {
  if (items.length === 0) {
    return { avgScore: 0, passed: false };
  }
  const sum = items.reduce((acc, item) => acc + item.score, 0);
  const avgScore = Math.round((sum / items.length) * 10) / 10;
  return { avgScore, passed: avgScore >= 80 };
}
