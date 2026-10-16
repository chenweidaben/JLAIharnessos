/**
 * 健澜科技 jlmedaios - 健康管理 V2 纯函数（M222-B）
 *
 * buildHealthManagementReportV2 / assessHealthRisk / trackChronicDiseaseControl
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估健康风险（纯函数）。
 *
 * @param questionnaire 问卷评分
 * @param vitals 生命体征异常数
 * @returns 风险等级
 */
export function assessHealthRisk(questionnaire: number, vitals: number): { level: string; high: boolean } {
  const score = questionnaire + vitals * 10;
  let level = '低风险';
  if (score >= 50) level = '高风险';
  else if (score >= 30) level = '中风险';
  return { level, high: score >= 50 };
}

/**
 * 追踪慢病控制率（纯函数）。
 *
 * @param patients 患者数
 * @param targets 达标数
 * @returns 控制率
 */
export function trackChronicDiseaseControl(patients: number, targets: number): { rate: number; controlled: boolean } {
  const rate = patients > 0 ? Math.round((targets / patients) * 100) : 0;
  return { rate, controlled: rate >= 60 };
}

/** 健康管理 V2 报告输出 */
export interface HealthManagementReportV2 {
  timeRange: string;
  screening: { exams: number };
  risk: { assessed: number };
  chronic: { hypertension: number; diabetes: number; cad: number; copd: number };
  education: { sessions: number };
  intervention: { lifestyle: number };
  records: { ehr: number };
  insurance: { commercial: number };
  center: { visits: number };
  suggestions: string[];
}

/**
 * 构建健康管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 健康管理 V2 报告
 */
export function buildHealthManagementReportV2(timeRange: string): HealthManagementReportV2 {
  return {
    timeRange,
    screening: { exams: 10000 },
    risk: { assessed: 5000 },
    chronic: { hypertension: 3000, diabetes: 1500, cad: 500, copd: 300 },
    education: { sessions: 100 },
    intervention: { lifestyle: 2000 },
    records: { ehr: 50000 },
    insurance: { commercial: 500 },
    center: { visits: 8000 },
    suggestions: ['提高高血压控制率', '扩大糖尿病管理覆盖'],
  };
}
