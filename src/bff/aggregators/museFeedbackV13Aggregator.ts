/**
 * 健澜科技 jlmedaios - MUSE 建议采纳反馈 V13 纯函数（M319-B）
 *
 * computeDoctorHitRateV13 / classifyFeedbackTypesV13 / flagLowHitRateDoctorsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** MUSE 反馈 */
export interface MuseFeedbackV13 {
  feedbackId: string;
  doctorId: string;
  dept: string;
  feedbackType: "adopt" | "ignore" | "error";
}

/** 医生命中率 */
export interface DoctorHitRateV13 {
  doctorId: string;
  hitRate: number;
}

/** 反馈分类 */
export interface FeedbackClassificationV13 {
  adopt: number;
  ignore: number;
  error: number;
}

/**
 * 医生建议命中率（纯函数）：采纳数/总建议数×100。
 *
 * @param feedbacks 反馈列表
 * @param doctorId 医生 ID
 * @returns 命中率百分比
 */
export function computeDoctorHitRateV13(feedbacks: MuseFeedbackV13[], doctorId: string): number {
  const docFeedbacks = feedbacks.filter((f) => f.doctorId === doctorId);
  if (docFeedbacks.length === 0) return 0;
  const adopt = docFeedbacks.filter((f) => f.feedbackType === "adopt").length;
  return Math.round((adopt / docFeedbacks.length) * 100);
}

/**
 * 反馈分类（纯函数）：采纳/忽略/错误 分组计数。
 *
 * @param feedbacks 反馈列表
 * @returns 分类计数
 */
export function classifyFeedbackTypesV13(feedbacks: MuseFeedbackV13[]): FeedbackClassificationV13 {
  const result: FeedbackClassificationV13 = { adopt: 0, ignore: 0, error: 0 };
  for (const f of feedbacks) {
    if (f.feedbackType === "adopt") result.adopt++;
    else if (f.feedbackType === "ignore") result.ignore++;
    else if (f.feedbackType === "error") result.error++;
  }
  return result;
}

/**
 * 低命中率医生标红（纯函数）：hitRate < threshold → 红牌。
 *
 * @param doctorRates 医生命中率列表
 * @param threshold 阈值
 * @returns 低命中率医生列表
 */
export function flagLowHitRateDoctorsV13(doctorRates: DoctorHitRateV13[], threshold: number): DoctorHitRateV13[] {
  return doctorRates.filter((d) => d.hitRate < threshold);
}
