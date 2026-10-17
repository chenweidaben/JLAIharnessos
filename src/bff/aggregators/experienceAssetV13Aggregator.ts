/**
 * 健澜科技 jlmedaios - 经验资产运营与退役 V13 纯函数（M305-A）
 *
 * scoreAssetValueV13 / identifyStaleExperienceV13 / retireExperienceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 资产经验 */
export interface AssetExperienceV13 {
  experienceId: string;
  title: string;
  recentUseCount: number;
  evidenceStrength: number;
  freshnessScore: number;
  daysSinceLastUse: number;
  status: "active" | "retired";
}

/** 资产分 */
export interface AssetScoreV13 {
  experienceId: string;
  score: number;
}

/**
 * 资产价值分（纯函数）：recentUseCount×10×0.4 + evidenceStrength×100×0.3 + freshnessScore×0.3，保留1位。
 *
 * @param exp 经验
 * @returns 资产分
 */
export function scoreAssetValueV13(exp: AssetExperienceV13): number {
  const raw =
    exp.recentUseCount * 10 * 0.4 +
    exp.evidenceStrength * 100 * 0.3 +
    exp.freshnessScore * 0.3;
  return Math.round(raw * 10) / 10;
}

/**
 * 陈旧识别（纯函数）：daysSinceLastUse>180 且 evidenceStrength<0.5 → stale=true。
 *
 * @param exp 经验
 * @returns 是否陈旧
 */
export function identifyStaleExperienceV13(exp: AssetExperienceV13): boolean {
  return exp.daysSinceLastUse > 180 && exp.evidenceStrength < 0.5;
}

/**
 * 退役归档（纯函数）：status="retired"，不删。
 *
 * @param exp 经验
 * @returns 归档后的经验
 */
export function retireExperienceV13(exp: AssetExperienceV13): AssetExperienceV13 {
  return { ...exp, status: "retired" };
}
