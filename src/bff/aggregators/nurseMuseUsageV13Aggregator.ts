/**
 * 健澜科技 jlmedaios - 护士个人智能体使用统计 V13 纯函数（M320-A）
 *
 * computeNurseCallCountV13 / classifyNurseScenariosV13 / computeNurseHitRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护士 MUSE 使用记录 */
export interface NurseMuseUsageV13 {
  usageId: string;
  nurseId: string;
  scenario: "medicationCheck" | "carePlan" | "riskAlert";
}

/** 护士反馈 */
export interface NurseMuseFeedbackV13 {
  feedbackId: string;
  nurseId: string;
  isAdopted: boolean;
}

/** 护士场景分布 */
export interface NurseScenarioDistributionV13 {
  medicationCheck: number;
  carePlan: number;
  riskAlert: number;
}

/**
 * 护士调用次数（纯函数）。
 *
 * @param usages 使用记录列表
 * @param nurseId 护士 ID
 * @returns 调用次数
 */
export function computeNurseCallCountV13(usages: NurseMuseUsageV13[], nurseId: string): number {
  return usages.filter((u) => u.nurseId === nurseId).length;
}

/**
 * 场景分布（纯函数）：用药核对/护理计划/风险预警 分组计数。
 *
 * @param usages 使用记录列表
 * @returns 场景分布
 */
export function classifyNurseScenariosV13(usages: NurseMuseUsageV13[]): NurseScenarioDistributionV13 {
  const result: NurseScenarioDistributionV13 = { medicationCheck: 0, carePlan: 0, riskAlert: 0 };
  for (const u of usages) {
    if (u.scenario === "medicationCheck") result.medicationCheck++;
    else if (u.scenario === "carePlan") result.carePlan++;
    else if (u.scenario === "riskAlert") result.riskAlert++;
  }
  return result;
}

/**
 * 护士建议命中率（纯函数）：采纳数/总反馈数×100。
 *
 * @param feedbacks 反馈列表
 * @param nurseId 护士 ID
 * @returns 命中率百分比
 */
export function computeNurseHitRateV13(feedbacks: NurseMuseFeedbackV13[], nurseId: string): number {
  const nurseFeedbacks = feedbacks.filter((f) => f.nurseId === nurseId);
  if (nurseFeedbacks.length === 0) return 0;
  const adopted = nurseFeedbacks.filter((f) => f.isAdopted).length;
  return Math.round((adopted / nurseFeedbacks.length) * 100);
}
