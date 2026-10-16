/**
 * 健澜科技 jlmedaios - 营养膳食纯函数（M220-C）
 *
 * buildNutritionReport / screenNutritionalRisk / designNutritionPrescription
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 筛查营养风险（纯函数）。
 *
 * @param score NRS2002评分
 * @returns 是否有风险
 */
export function screenNutritionalRisk(score: number): { atRisk: boolean; level: string } {
  let level = '低风险';
  if (score >= 5) level = '高风险';
  else if (score >= 3) level = '中风险';
  return { atRisk: score >= 3, level };
}

/**
 * 设计营养处方（纯函数）。
 *
 * @param condition 疾病状态
 * @param weight 体重（kg）
 * @returns 处方
 */
export function designNutritionPrescription(condition: string, weight: number): { calories: number; protein: number; route: string } {
  let route = 'EN';
  if (condition.includes('肠瘘') || condition.includes('重症')) route = 'PN';
  const calories = weight * 25;
  const protein = weight * 1.2;
  return { calories: Math.round(calories), protein: Math.round(protein), route };
}

/** 营养膳食报告输出 */
export interface NutritionReport {
  timeRange: string;
  screening: { nrs2002: number; pgsga: number };
  treatment: { en: number; pn: number; therapeutic: number };
  special: { maternity: number; pediatric: number; elderly: number; oncology: number; critical: number };
  clinic: { visits: number };
  meals: { served: number };
  followup: { patients: number };
  suggestions: string[];
}

/**
 * 构建营养膳食报告。
 *
 * @param timeRange 时间范围
 * @returns 营养膳食报告
 */
export function buildNutritionReport(timeRange: string): NutritionReport {
  return {
    timeRange,
    screening: { nrs2002: 500, pgsga: 100 },
    treatment: { en: 200, pn: 50, therapeutic: 300 },
    special: { maternity: 30, pediatric: 50, elderly: 80, oncology: 60, critical: 20 },
    clinic: { visits: 200 },
    meals: { served: 100000 },
    followup: { patients: 150 },
    suggestions: ['扩大营养筛查覆盖', '加强治疗膳食管理'],
  };
}
