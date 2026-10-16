/**
 * 健澜科技 jlmedaios - 智慧医疗深化纯函数（M195-D）
 *
 * buildSmartHealthcareReport / assistDiagnosis / predictHealthRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 症状与病史 */
export interface DiagnosisInput {
  symptoms: string[];
  history: string[];
  age: number;
}

/**
 * 智能辅助诊断（纯函数）。
 *
 * @param input 症状与病史
 * @returns 可能诊断列表
 */
export function assistDiagnosis(input: DiagnosisInput): { diagnosis: string; probability: number }[] {
  const results: { diagnosis: string; probability: number }[] = [];
  if (input.symptoms.includes('发热') && input.symptoms.includes('咳嗽')) {
    results.push({ diagnosis: '呼吸道感染', probability: 0.75 });
  }
  if (input.symptoms.includes('胸痛') && input.history.includes('高血压')) {
    results.push({ diagnosis: '冠心病', probability: 0.65 });
  }
  if (input.age > 65 && input.symptoms.includes('多饮多尿')) {
    results.push({ diagnosis: '糖尿病', probability: 0.55 });
  }
  if (results.length === 0) {
    results.push({ diagnosis: '待进一步检查', probability: 0.3 });
  }
  return results;
}

/** 患者数据 */
export interface PatientRiskData {
  age: number;
  bmi: number;
  smoking: boolean;
  familyHistory: boolean;
}

/**
 * 健康风险预测（纯函数）。
 *
 * @param data 患者数据
 * @returns 风险等级
 */
export function predictHealthRisk(data: PatientRiskData): { level: 'low' | 'medium' | 'high'; score: number } {
  let score = 0;
  if (data.age > 60) score += 20;
  if (data.bmi > 28) score += 25;
  if (data.smoking) score += 25;
  if (data.familyHistory) score += 20;
  if (score >= 60) return { level: 'high', score };
  if (score >= 30) return { level: 'medium', score };
  return { level: 'low', score };
}

/** 智慧医疗报告输出 */
export interface SmartHealthcareReport {
  timeRange: string;
  triage: { intelligent: number; accuracy: number };
  preVisit: { consultations: number };
  diagnosis: { assisted: number; accuracy: number };
  treatment: { suggestions: number };
  medication: { reviews: number; interceptRate: number };
  followup: { intelligent: number };
  healthRisk: { assessed: number; highRisk: number };
  suggestions: string[];
}

/**
 * 构建智慧医疗报告。
 *
 * @param timeRange 时间范围
 * @returns 智慧医疗报告
 */
export function buildSmartHealthcareReport(timeRange: string): SmartHealthcareReport {
  return {
    timeRange,
    triage: { intelligent: 5000, accuracy: 0.92 },
    preVisit: { consultations: 3000 },
    diagnosis: { assisted: 2000, accuracy: 0.88 },
    treatment: { suggestions: 1500 },
    medication: { reviews: 5000, interceptRate: 0.05 },
    followup: { intelligent: 1000 },
    healthRisk: { assessed: 800, highRisk: 120 },
    suggestions: ['提升智能诊断准确率', '扩大 AI 辅助用药覆盖'],
  };
}
