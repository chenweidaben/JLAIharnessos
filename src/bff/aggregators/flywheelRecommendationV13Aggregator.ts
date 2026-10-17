/**
 * 健澜科技 jlmedaios - 飞轮改进建议 V13 纯函数（M306-C）
 *
 * generateFlywheelRecommendationV13 / estimateImprovementV13 / rankRecommendationsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 改进建议 */
export interface FlywheelRecommendationV13 {
  bottleneck: string;
  action: string;
  expectedGain: number;
}

const ACTION_MAP: Record<string, { action: string; gain: number }> = {
  crossDeptDiffusionRate: { action: "开跨科病例讨论会", gain: 7.5 },
  pushCtr: { action: "优化推送时机", gain: 6 },
  adoptionRate: { action: "加强医生培训", gain: 5 },
  feedbackLoopRate: { action: "完善反馈激励", gain: 5 },
  qualityScore: { action: "强化同行评审", gain: 6 },
  assetHealthScore: { action: "清理僵尸经验", gain: 5 },
};

/**
 * 改进建议（纯函数）：按瓶颈维度映射动作。
 *
 * @param bottleneck 瓶颈维度
 * @returns 建议
 */
export function generateFlywheelRecommendationV13(bottleneck: string): FlywheelRecommendationV13 {
  const mapped = ACTION_MAP[bottleneck] ?? { action: "综合优化", gain: 5 };
  return {
    bottleneck,
    action: mapped.action,
    expectedGain: mapped.gain,
  };
}

/**
 * 预计提升（纯函数）：currentScore + expectedGain，保留1位。
 *
 * @param currentScore 当前分
 * @param recommendation 建议
 * @returns 预计新分
 */
export function estimateImprovementV13(
  currentScore: number,
  recommendation: FlywheelRecommendationV13,
): number {
  return Math.round((currentScore + recommendation.expectedGain) * 10) / 10;
}

/**
 * 建议排序（纯函数）：预计提升高的在前。
 *
 * @param recommendations 建议列表
 * @returns 排序后
 */
export function rankRecommendationsV13(
  recommendations: FlywheelRecommendationV13[],
): FlywheelRecommendationV13[] {
  return [...recommendations].sort((a, b) => b.expectedGain - a.expectedGain);
}
