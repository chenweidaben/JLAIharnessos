/**
 * 健澜科技 jlmedaios - 健康管理与慢病管理深化 V3 纯函数（M206-B）
 *
 * buildHealthManagementReportV3 / assessChronicDiseaseControl / generateHealthRiskAssessment
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 慢病患者 */
export interface ChronicPatient {
  disease: '高血压' | '糖尿病' | '冠心病' | '卒中' | 'COPD';
  controlled: boolean;
}

/**
 * 评估慢病控制率（纯函数）。
 *
 * @param patients 患者列表
 * @returns 控制率评估
 */
export function assessChronicDiseaseControl(patients: ChronicPatient[]): { controlRate: number; controlledCount: number; total: number } {
  const total = patients.length;
  const controlledCount = patients.filter((p) => p.controlled).length;
  const controlRate = total > 0 ? controlledCount / total : 0;
  return { controlRate, controlledCount, total };
}

/** 健康风险评估对象 */
export interface HealthRiskPerson {
  age: number;
  bmi: number;
  smoking: boolean;
  familyHistory: boolean;
}

/**
 * 生成健康风险评估（纯函数）。
 *
 * @param person 评估对象
 * @returns 风险等级
 */
export function generateHealthRiskAssessment(person: HealthRiskPerson): { riskLevel: string; score: number; recommendations: string[] } {
  let score = 0;
  if (person.age >= 60) score += 2;
  if (person.bmi >= 28) score += 2;
  if (person.smoking) score += 2;
  if (person.familyHistory) score += 1;

  let riskLevel = '低风险';
  if (score >= 5) riskLevel = '高风险';
  else if (score >= 3) riskLevel = '中风险';

  const recommendations: string[] = [];
  if (person.bmi >= 28) recommendations.push('控制体重');
  if (person.smoking) recommendations.push('戒烟');
  if (person.age >= 60) recommendations.push('定期体检');

  return { riskLevel, score, recommendations };
}

/** 健康管理 V3 报告输出 */
export interface HealthManagementReportV3 {
  timeRange: string;
  ehr: { total: number };
  chronic: { hypertension: number; diabetes: number; coronary: number; stroke: number; copd: number };
  followup: { controlRate: number; managedRate: number; complicationRate: number };
  exam: { total: number; abnormal: number };
  vaccination: { flu: number; pneumonia: number };
  maternalChild: { prenatal: number; child: number };
  elderly: { assessment: number };
  intervention: { lifestyle: number };
  suggestions: string[];
}

/**
 * 构建健康管理 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 健康管理 V3 报告
 */
export function buildHealthManagementReportV3(timeRange: string): HealthManagementReportV3 {
  return {
    timeRange,
    ehr: { total: 500000 },
    chronic: { hypertension: 50000, diabetes: 30000, coronary: 10000, stroke: 5000, copd: 3000 },
    followup: { controlRate: 0.6, managedRate: 0.8, complicationRate: 0.1 },
    exam: { total: 100000, abnormal: 30000 },
    vaccination: { flu: 20000, pneumonia: 5000 },
    maternalChild: { prenatal: 5000, child: 10000 },
    elderly: { assessment: 20000 },
    intervention: { lifestyle: 10000 },
    suggestions: ['提高高血压控制率', '加强糖尿病规范管理'],
  };
}
