/**
 * 健澜科技 jlmedaios - 预防医学与公共卫生 V3 纯函数（M239-A）
 *
 * buildPreventiveMedicineV3Report / assessVaccinationCoverage / predictChronicDiseaseRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估疫苗接种覆盖率（纯函数）。
 *
 * @param population 人口
 * @param doses 剂次
 * @returns 覆盖率
 */
export function assessVaccinationCoverage(population: number, doses: number): { coverage: number; meet: boolean } {
  let coverage = Math.round((doses / population) * 100);
  if (coverage > 100) coverage = 100;
  return { coverage, meet: coverage >= 90 };
}

/**
 * 预测慢病风险（纯函数）。
 *
 * @param person 个人
 * @returns 风险
 */
export function predictChronicDiseaseRisk(person: { age: number; bmi: number; smoking: boolean; familyHistory: boolean }): { risk: number; level: string } {
  let risk = person.age * 0.5;
  if (person.bmi > 28) risk += 20;
  if (person.smoking) risk += 15;
  if (person.familyHistory) risk += 10;
  let level = "低";
  if (risk > 50) level = "高";
  else if (risk > 30) level = "中";
  return { risk, level };
}

/** 预防医学 V3 报告输出 */
export interface PreventiveMedicineV3Report {
  timeRange: string;
  immunization: { coverage: number; coldChain: number };
  surveillance: { notifiable: number; alerts: number };
  chronic: { hypertension: number; diabetes: number; stroke: number; cancer: number };
  school: number;
  nutrition: number;
  suggestions: string[];
}

/**
 * 构建预防医学 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 预防医学 V3 报告
 */
export function buildPreventiveMedicineV3Report(timeRange: string): PreventiveMedicineV3Report {
  return {
    timeRange,
    immunization: { coverage: 95, coldChain: 100 },
    surveillance: { notifiable: 500, alerts: 20 },
    chronic: { hypertension: 50000, diabetes: 30000, stroke: 5000, cancer: 2000 },
    school: 10000,
    nutrition: 8000,
    suggestions: ["提升二类疫苗接种率", "加强慢病危险因素干预"],
  };
}
