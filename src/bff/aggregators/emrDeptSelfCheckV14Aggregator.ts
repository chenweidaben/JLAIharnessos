/**
 * 健澜科技 jlmedaios - 病历质控科室自查 V14 聚合器（M474-B）
 *
 * 纯函数：创建自查记录 + 计算自查得分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 自查项 */
export interface SelfCheckItemV14 {
  name: string;
  passed: boolean;
}

/** 自查记录 */
export interface SelfCheckV14 {
  id: string;
  dept: string;
  items: SelfCheckItemV14[];
  score: number;
}

/** 自查得分结果 */
export interface SelfCheckScoreV14 {
  total: number;
  passedCount: number;
  score: number;
}

/**
 * 计算自查得分：passedCount=通过数，score=passedCount/total×100（整数）。
 *
 * @param items 自查项列表
 * @returns 得分结果
 */
export function computeSelfCheckScore(items: SelfCheckItemV14[]): SelfCheckScoreV14 {
  const total = items.length;
  const passedCount = items.filter((item) => item.passed).length;
  const score = total === 0 ? 0 : Math.round((passedCount / total) * 100);
  return { total, passedCount, score };
}

/**
 * 创建科室自查记录，自动计算得分。
 *
 * @param dept 科室名
 * @param items 自查项列表
 * @returns 自查记录
 */
export function buildSelfCheck(dept: string, items: SelfCheckItemV14[]): SelfCheckV14 {
  const { score } = computeSelfCheckScore(items);
  return {
    id: `SC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    dept,
    items,
    score,
  };
}
