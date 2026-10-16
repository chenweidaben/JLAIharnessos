/**
 * 健澜科技 jlmedaios - 职业与环境健康 V3 纯函数（M239-D）
 *
 * buildOccupationalEnvironmentalV3Report / assessOccupationalExposureV3 / screenMentalHealth
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估职业暴露 V3（纯函数）。
 *
 * @param exposure 暴露
 * @param limits 限值
 * @returns 暴露
 */
export function assessOccupationalExposureV3(exposure: number, limits: number): { ratio: number; exceed: boolean } {
  let ratio = Math.round((exposure / limits) * 100);
  return { ratio, exceed: ratio > 100 };
}

/**
 * 筛查心理健康（纯函数）。
 *
 * @param questionnaire 问卷
 * @returns 筛查
 */
export function screenMentalHealth(questionnaire: { score: number; depression: boolean; anxiety: boolean }): { risk: string; eap: boolean } {
  let risk = "低";
  let eap = false;
  if (questionnaire.depression || questionnaire.anxiety || questionnaire.score > 15) {
    risk = "高";
    eap = true;
  } else if (questionnaire.score > 8) {
    risk = "中";
  }
  return { risk, eap };
}

/** 职业环境 V3 报告输出 */
export interface OccupationalEnvironmentalV3Report {
  timeRange: string;
  exam: { pre: number; in: number; post: number };
  disease: { pneumoconiosis: number; toxicosis: number };
  workRelated: { msd: number; burnout: number };
  environment: { air: number; water: number; noise: number; radiation: number };
  mental: { screened: number; eap: number };
  suggestions: string[];
}

/**
 * 构建职业环境 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 职业环境 V3 报告
 */
export function buildOccupationalEnvironmentalV3Report(timeRange: string): OccupationalEnvironmentalV3Report {
  return {
    timeRange,
    exam: { pre: 5000, in: 20000, post: 3000 },
    disease: { pneumoconiosis: 50, toxicosis: 20 },
    workRelated: { msd: 2000, burnout: 500 },
    environment: { air: 1000, water: 500, noise: 800, radiation: 100 },
    mental: { screened: 10000, eap: 500 },
    suggestions: ["加强尘肺筛查", "扩大EAP服务覆盖"],
  };
}
