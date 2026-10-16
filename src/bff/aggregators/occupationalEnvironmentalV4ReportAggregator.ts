/**
 * 健澜科技 jlmedaios - 职业环境 V4 纯函数（M249-D）
 *
 * buildOccupationalEnvironmentalV4Report / assessOccupationalExposureV4 / screenMentalHealthV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估职业暴露 V4（纯函数）。
 *
 * @param exposure 暴露
 * @param limits 限值
 * @returns 暴露
 */
export function assessOccupationalExposureV4(exposure: { dust: number; noise: number; chemical: number }, limits: { dust: number; noise: number; chemical: number }): { overLimit: string[]; compliant: boolean } {
  const overLimit: string[] = [];
  if (exposure.dust > limits.dust) overLimit.push("粉尘");
  if (exposure.noise > limits.noise) overLimit.push("噪音");
  if (exposure.chemical > limits.chemical) overLimit.push("化学物");
  return { overLimit, compliant: overLimit.length === 0 };
}

/**
 * 筛查心理健康 V4（纯函数）。
 *
 * @param questionnaire 问卷
 * @returns 筛查
 */
export function screenMentalHealthV4(questionnaire: { gds: number; phq9: number }): { depression: boolean; anxiety: boolean; refer: boolean } {
  const depression = questionnaire.phq9 >= 10;
  const anxiety = questionnaire.gds >= 6;
  return { depression, anxiety, refer: depression || anxiety };
}

/** 职业环境 V4 报告输出 */
export interface OccupationalEnvironmentalV4Report {
  timeRange: string;
  exam: { pre: number; on: number; exit: number };
  disease: { pneumoconiosis: number; poisoning: number; neoplasm: number };
  ergonomic: { msd: number; burnout: number; stress: number };
  environment: { air: number; water: number; noise: number; radiation: number };
  mental: { eap: number; counseling: number; crisis: number };
  suggestions: string[];
}

/**
 * 构建职业环境 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 职业环境 V4 报告
 */
export function buildOccupationalEnvironmentalV4Report(timeRange: string): OccupationalEnvironmentalV4Report {
  return {
    timeRange,
    exam: { pre: 500, on: 2000, exit: 300 },
    disease: { pneumoconiosis: 20, poisoning: 5, neoplasm: 10 },
    ergonomic: { msd: 300, burnout: 100, stress: 200 },
    environment: { air: 100, water: 50, noise: 80, radiation: 10 },
    mental: { eap: 200, counseling: 150, crisis: 5 },
    suggestions: ["降低粉尘暴露", "加强 EAP 服务"],
  };
}
