/**
 * 健澜科技 jlmedaios - 预防医学公卫 V4 纯函数（M249-A）
 *
 * buildPreventiveMedicineV4Report / assessVaccinationCoverageV4 / predictChronicDiseaseRiskV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估疫苗接种率 V4（纯函数）。
 *
 * @param population 人口
 * @param doses 剂次
 * @returns 覆盖率
 */
export function assessVaccinationCoverageV4(population: number, doses: number): { coverage: number; adequate: boolean } {
  const coverage = Math.round((doses / Math.max(population, 1)) * 1000) / 10;
  return { coverage, adequate: coverage >= 90 };
}

/**
 * 预测慢病风险 V4（纯函数）。
 *
 * @param person 个人
 * @returns 风险
 */
export function predictChronicDiseaseRiskV4(person: { age: number; bmi: number; smoking: boolean; familyHistory: boolean }): { risk: number; level: string } {
  let risk = 10;
  if (person.age >= 50) risk += 20;
  if (person.bmi >= 28) risk += 20;
  if (person.smoking) risk += 20;
  if (person.familyHistory) risk += 20;
  let level = "低";
  if (risk >= 60) level = "高";
  else if (risk >= 30) level = "中";
  return { risk, level };
}

/** 预防公卫 V4 报告输出 */
export interface PreventiveMedicineV4Report {
  timeRange: string;
  immunization: { vaccines: number; coldChain: number; adverse: number };
  surveillance: { classA: number; classB: number; warning: number };
  chronic: { hypertension: number; diabetes: number; stroke: number };
  school: { myopia: number; obesity: number; nutrition: number };
  suggestions: string[];
}

/**
 * 构建预防公卫 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 预防公卫 V4 报告
 */
export function buildPreventiveMedicineV4Report(timeRange: string): PreventiveMedicineV4Report {
  return {
    timeRange,
    immunization: { vaccines: 30, coldChain: 100, adverse: 5 },
    surveillance: { classA: 0, classB: 50, warning: 20 },
    chronic: { hypertension: 5000, diabetes: 2000, stroke: 500 },
    school: { myopia: 60, obesity: 15, nutrition: 10000 },
    suggestions: ["提升疫苗接种率", "加强慢病危险因素干预"],
  };
}
