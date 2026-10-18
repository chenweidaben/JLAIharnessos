/**
 * 健澜科技 jlmedaios - 病历质量实时评分仪表盘 V14 聚合器（M465-B）
 *
 * 纯函数：百分制评分计算 + 按 score 降序排名。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评分入参 */
export interface QualityScoreInputV14 {
  name: string;
  block: number;
  major: number;
  minor: number;
}

/** 排名结果项 */
export interface QualityRankItemV14 {
  name: string;
  score: number;
  rank: number;
}

/**
 * 计算百分制质量评分。
 *
 * @param passed 通过病历数（保留接口完整性，当前未参与计算）
 * @param block block 缺陷数（每条扣 15 分）
 * @param major major 缺陷数（每条扣 8 分）
 * @param minor minor 缺陷数（每条扣 3 分）
 * @returns 评分（clamp 到 0-100）
 */
export function computeQualityScore(passed: number, block: number, major: number, minor: number): number {
  void passed;
  const raw = 100 - block * 15 - major * 8 - minor * 3;
  return Math.max(0, Math.min(100, raw));
}

/**
 * 按 score 降序排名（rank 从 1 开始）。
 *
 * @param items 评分入参列表
 * @returns 排名结果
 */
export function rankByScore(items: QualityScoreInputV14[]): QualityRankItemV14[] {
  const withScore = items.map((item) => ({
    name: item.name,
    score: computeQualityScore(0, item.block, item.major, item.minor),
  }));
  withScore.sort((a, b) => b.score - a.score);
  return withScore.map((item, index) => ({ ...item, rank: index + 1 }));
}
