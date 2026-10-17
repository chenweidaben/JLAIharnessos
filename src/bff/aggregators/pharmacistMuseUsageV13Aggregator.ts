/**
 * 健澜科技 jlmedaios - 药师个人智能体使用统计 V13 纯函数（M320-B）
 *
 * computePharmacistCallCountV13 / classifyPharmacistScenariosV13 / computeAdoptionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药师 MUSE 使用记录 */
export interface PharmacistMuseUsageV13 {
  usageId: string;
  pharmacistId: string;
  scenario: "prescriptionReview" | "interaction" | "contraindication";
}

/** 药师反馈 */
export interface PharmacistMuseFeedbackV13 {
  feedbackId: string;
  pharmacistId: string;
  isAdopted: boolean;
}

/** 药师场景分布 */
export interface PharmacistScenarioDistributionV13 {
  prescriptionReview: number;
  interaction: number;
  contraindication: number;
}

/**
 * 药师调用次数（纯函数）。
 *
 * @param usages 使用记录列表
 * @param pharmacistId 药师 ID
 * @returns 调用次数
 */
export function computePharmacistCallCountV13(usages: PharmacistMuseUsageV13[], pharmacistId: string): number {
  return usages.filter((u) => u.pharmacistId === pharmacistId).length;
}

/**
 * 场景分布（纯函数）：审方/相互作用/配伍禁忌 分组计数。
 *
 * @param usages 使用记录列表
 * @returns 场景分布
 */
export function classifyPharmacistScenariosV13(usages: PharmacistMuseUsageV13[]): PharmacistScenarioDistributionV13 {
  const result: PharmacistScenarioDistributionV13 = { prescriptionReview: 0, interaction: 0, contraindication: 0 };
  for (const u of usages) {
    if (u.scenario === "prescriptionReview") result.prescriptionReview++;
    else if (u.scenario === "interaction") result.interaction++;
    else if (u.scenario === "contraindication") result.contraindication++;
  }
  return result;
}

/**
 * 采纳率（纯函数）：采纳数/总反馈数×100。
 *
 * @param feedbacks 反馈列表
 * @param pharmacistId 药师 ID
 * @returns 采纳率百分比
 */
export function computeAdoptionRateV13(feedbacks: PharmacistMuseFeedbackV13[], pharmacistId: string): number {
  const pharmacistFeedbacks = feedbacks.filter((f) => f.pharmacistId === pharmacistId);
  if (pharmacistFeedbacks.length === 0) return 0;
  const adopted = pharmacistFeedbacks.filter((f) => f.isAdopted).length;
  return Math.round((adopted / pharmacistFeedbacks.length) * 100);
}
