/**
 * 健澜科技 jlmedaios - 文化品牌纯函数（M213-D）
 *
 * buildCultureBrandReport / scoreBrandAwareness / assessPatientExperience
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评分品牌认知度（纯函数）。
 *
 * @param surveys 调研分数（0-100）
 * @returns 平均分与等级
 */
export function scoreBrandAwareness(surveys: number[]): { avg: number; level: string } {
  const avg = surveys.length > 0 ? surveys.reduce((a, b) => a + b, 0) / surveys.length : 0;
  let level = '中等';
  if (avg >= 85) level = '高';
  else if (avg < 60) level = '低';
  return { avg, level };
}

/**
 * 评估患者体验（纯函数）。
 *
 * @param journey 旅程评分（0-100）
 * @returns 总分与等级
 */
export function assessPatientExperience(journey: number[]): { total: number; level: string } {
  const total = journey.reduce((a, b) => a + b, 0) / Math.max(journey.length, 1);
  let level = '良好';
  if (total >= 90) level = '优秀';
  else if (total < 75) level = '待改进';
  return { total, level };
}

/** 文化品牌报告输出 */
export interface CultureBrandReport {
  timeRange: string;
  spirit: { motto: string; vision: string; mission: string };
  stories: { published: number };
  brand: { vi: boolean; logo: string };
  patientExperience: { score: number };
  employeeCulture: { activities: number };
  charity: { events: number };
  exchange: { visits: number };
 cultureExhibition: { museum: boolean };
  suggestions: string[];
}

/**
 * 构建文化品牌报告。
 *
 * @param timeRange 时间范围
 * @returns 文化品牌报告
 */
export function buildCultureBrandReport(timeRange: string): CultureBrandReport {
  return {
    timeRange,
    spirit: { motto: '仁爱·精医·创新·卓越', vision: '建设一流的智慧医院', mission: '以患者为中心' },
    stories: { published: 30 },
    brand: { vi: true, logo: '健澜科技' },
    patientExperience: { score: 88 },
    employeeCulture: { activities: 20 },
    charity: { events: 10 },
    exchange: { visits: 15 },
    cultureExhibition: { museum: true },
    suggestions: ['提高品牌认知度', '改善患者体验'],
  };
}
