/**
 * 健澜科技 jlmedaios - 科室病历质控评分排名 V14 聚合器（M461-D，M461 收官）
 *
 * 纯函数：百分制评分 + 按科室降序排名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 科室质控统计项 */
export interface DeptQcItemV14 {
  dept: string;
  passed: number;
  block: number;
  major: number;
  minor: number;
}

/** 排名结果单项 */
export interface DeptQcRankV14 {
  dept: string;
  score: number;
  rank: number;
}

/**
 * 计算科室质控百分制评分。
 *
 * @param passed 通过病历数（不参与扣分，仅占位）
 * @param block 拦截缺陷数（每条扣 15）
 * @param major 主要缺陷数（每条扣 8）
 * @param minor 一般缺陷数（每条扣 3）
 * @returns 0-100 分
 */
export function computeDeptQcScore(passed: number, block: number, major: number, minor: number): number {
  void passed;
  const raw = 100 - block * 15 - major * 8 - minor * 3;
  return Math.max(0, Math.min(100, raw));
}

/**
 * 按科室质控评分降序排名。
 *
 * @param items 科室质控统计数组
 * @returns 排名数组（rank 从 1 开始）
 */
export function rankDepts(items: DeptQcItemV14[]): DeptQcRankV14[] {
  const scored = items.map((item) => ({
    dept: item.dept,
    score: computeDeptQcScore(item.passed, item.block, item.major, item.minor),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, idx) => ({ dept: s.dept, score: s.score, rank: idx + 1 }));
}
