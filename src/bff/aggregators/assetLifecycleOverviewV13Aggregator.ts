/**
 * 健澜科技 jlmedaios - 经验资产生命周期总览 V13 纯函数（M305-D）
 *
 * buildAssetLifecycleOverviewV13 / computeAssetHealthV13 / identifyAssetGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 入参 */
export interface AssetLifecycleInputV13 {
  activeCount: number;
  staleCount: number;
  retiredCount: number;
  archivedCount: number;
  highValueActiveCount: number;
}

/** 总览 */
export interface AssetLifecycleOverviewV13 {
  activeCount: number;
  staleCount: number;
  retiredCount: number;
  archivedCount: number;
  avgAssetValue: number;
}

/**
 * 汇总总览（纯函数）：avgAssetValue 用 active 与 highValue 粗略估算（高价值 active×80 + 普通 active×40）/total。
 *
 * @param input 入参
 * @returns 总览
 */
export function buildAssetLifecycleOverviewV13(input: AssetLifecycleInputV13): AssetLifecycleOverviewV13 {
  const total = input.activeCount + input.staleCount + input.retiredCount + input.archivedCount;
  if (total === 0) {
    return { activeCount: 0, staleCount: 0, retiredCount: 0, archivedCount: 0, avgAssetValue: 0 };
  }
  const normalActive = input.activeCount - input.highValueActiveCount;
  const avg = (input.highValueActiveCount * 80 + normalActive * 40) / total;
  return {
    activeCount: input.activeCount,
    staleCount: input.staleCount,
    retiredCount: input.retiredCount,
    archivedCount: input.archivedCount,
    avgAssetValue: Math.round(avg * 10) / 10,
  };
}

/**
 * 资产健康分（纯函数）：activeRatio×0.5 + highValueRatio×0.3 + archivedRatio×0.2，0-100。
 *
 * @param overview 总览
 * @param input 入参（用于计算占比）
 * @returns 健康分
 */
export function computeAssetHealthV13(
  overview: AssetLifecycleOverviewV13,
  input: AssetLifecycleInputV13,
): number {
  const total = input.activeCount + input.staleCount + input.retiredCount + input.archivedCount;
  if (total === 0) return 0;
  const activeRatio = (overview.activeCount / total) * 100;
  const highValueRatio = (input.highValueActiveCount / total) * 100;
  const archivedRatio = (overview.archivedCount / total) * 100;
  return Math.round(activeRatio * 0.5 + highValueRatio * 0.3 + archivedRatio * 0.2);
}

/**
 * 资产缺口（纯函数）：stale>10 → "僵尸经验堆积"；archived>20 → "归档库过大需复盘"。
 *
 * @param overview 总览
 * @returns 缺口描述
 */
export function identifyAssetGapV13(overview: AssetLifecycleOverviewV13): string {
  if (overview.archivedCount > 20) return "归档库过大需复盘";
  if (overview.staleCount > 10) return "僵尸经验堆积";
  return "";
}
