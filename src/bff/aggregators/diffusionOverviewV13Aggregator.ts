/**
 * 健澜科技 jlmedaios - 跨科室扩散总览 V13 纯函数（M304-D）
 *
 * buildDiffusionOverviewV13 / computeDiffusionMaturityV13 / identifyDiffusionGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 总览入参 */
export interface DiffusionOverviewInputV13 {
  totalBroadcasts: number;
  totalAdoptions: number;
  totalActions: number;
  totalDepts: number;
  influencerDepts: number;
  isolatedDepts: number;
}

/** 总览 */
export interface DiffusionOverviewV13 {
  totalBroadcasts: number;
  totalAdoptions: number;
  adoptionRate: number;
  influencerDepts: number;
  isolatedDepts: number;
}

/**
 * 汇总总览（纯函数）：adoptionRate=totalAdoptions/totalActions×100，保留1位。
 *
 * @param input 入参
 * @returns 总览
 */
export function buildDiffusionOverviewV13(input: DiffusionOverviewInputV13): DiffusionOverviewV13 {
  const rate = input.totalActions === 0
    ? 0
    : Math.round((input.totalAdoptions / input.totalActions) * 1000) / 10;
  return {
    totalBroadcasts: input.totalBroadcasts,
    totalAdoptions: input.totalAdoptions,
    adoptionRate: rate,
    influencerDepts: input.influencerDepts,
    isolatedDepts: input.isolatedDepts,
  };
}

/**
 * 扩散成熟度（纯函数）：broadcastRatio×0.3 + adoptionRate×0.4 + connectedRatio×0.3，0-100。
 *
 * @param overview 总览
 * @param totalDepts 总科室数
 * @returns 成熟度分
 */
export function computeDiffusionMaturityV13(overview: DiffusionOverviewV13, totalDepts: number): number {
  const connectedRatio = totalDepts === 0
    ? 0
    : Math.round(((totalDepts - overview.isolatedDepts) / totalDepts) * 1000) / 10;
  const broadcastRatio = Math.min(100, overview.totalBroadcasts * 20);
  const score = broadcastRatio * 0.3 + overview.adoptionRate * 0.4 + connectedRatio * 0.3;
  return Math.round(score);
}

/**
 * 扩散缺口（纯函数）：isolated>2 → "仍有科室处于知识孤岛"；adoptionRate<50 → "扩散后采纳不足"。
 *
 * @param overview 总览
 * @returns 缺口描述
 */
export function identifyDiffusionGapV13(overview: DiffusionOverviewV13): string {
  if (overview.adoptionRate < 50 && overview.adoptionRate > 0) return "扩散后采纳不足";
  if (overview.isolatedDepts > 2) return "仍有科室处于知识孤岛";
  return "";
}
