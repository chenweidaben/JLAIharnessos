/**
 * 健澜科技 jlmedaios - 医疗质量 V3 纯函数（M241-B）
 *
 * buildMedicalQualityV3Report / assessClinicalPathway / reviewRationalDrug
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估临床路径（纯函数）。
 *
 * @param pathway 路径
 * @returns 评估
 */
export function assessClinicalPathway(pathway: { enrolled: number; completed: number; variation: number }): { completion: number; variation: number } {
  let completion = Math.round((pathway.completed / pathway.enrolled) * 100);
  let variation = Math.round((pathway.variation / pathway.enrolled) * 100);
  return { completion, variation };
}

/**
 * 合理用药点评（纯函数）。
 *
 * @param drugs 药品
 * @returns 点评
 */
export function reviewRationalDrug(drugs: { total: number; irrational: number }): { rate: number; pass: boolean } {
  let rate = Math.round((drugs.irrational / drugs.total) * 100);
  return { rate, pass: rate < 5 };
}

/** 医疗质量 V3 报告输出 */
export interface MedicalQualityV3Report {
  timeRange: string;
  national: { indicators: number; reach: number };
  single: { ami: number; stroke: number; pneumonia: number; periOp: number };
  pathway: { enrolled: number; completion: number };
  antimicrobial: { reviewed: number; irrational: number };
  suggestions: string[];
}

/**
 * 构建医疗质量 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 医疗质量 V3 报告
 */
export function buildMedicalQualityV3Report(timeRange: string): MedicalQualityV3Report {
  return {
    timeRange,
    national: { indicators: 40, reach: 90 },
    single: { ami: 200, stroke: 300, pneumonia: 500, periOp: 1000 },
    pathway: { enrolled: 10000, completion: 8500 },
    antimicrobial: { reviewed: 5000, irrational: 200 },
    suggestions: ["提高路径入径完成率", "降低抗菌药不合理率"],
  };
}
