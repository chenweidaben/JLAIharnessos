/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化 V2 纯函数（M208-A）
 *
 * buildAIAssistReportV2 / assessAIAdoptionRate / generateDifferentialDiagnosis
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估 AI 建议采纳率（纯函数）。
 *
 * @param suggestions 建议总数
 * @param adopted 采纳数
 * @returns 采纳率
 */
export function assessAIAdoptionRate(suggestions: number, adopted: number): { adoptionRate: number; level: string } {
  const rate = suggestions > 0 ? adopted / suggestions : 0;
  let level = '低';
  if (rate >= 0.7) level = '高';
  else if (rate >= 0.4) level = '中';
  return { adoptionRate: rate, level };
}

/**
 * 生成鉴别诊断（纯函数）。
 *
 * @param symptoms 症状列表
 * @returns 鉴别诊断列表
 */
export function generateDifferentialDiagnosis(symptoms: string[]): { diagnoses: string[]; top1: string } {
  const diagnoses: string[] = [];
  if (symptoms.includes('发热') && symptoms.includes('咳嗽')) diagnoses.push('肺炎', '上呼吸道感染', '肺结核');
  if (symptoms.includes('胸痛')) diagnoses.push('急性心梗', '心绞痛', '肺栓塞', '主动脉夹层');
  if (symptoms.includes('腹痛')) diagnoses.push('急性阑尾炎', '急性胆囊炎', '消化道穿孔');
  if (diagnoses.length === 0) diagnoses.push('待查');
  return { diagnoses, top1: diagnoses[0] };
}

/** AI 辅助 V2 报告输出 */
export interface AIAssistReportV2 {
  timeRange: string;
  cdss: { suggestions: number; adopted: number; modified: number };
  medication: { alerts: number; interactions: number; contraindications: number };
  emr: { autoWritten: number };
  report: { interpreted: number };
  pathway: { applied: number };
  warning: { sepsis: number; heartFailure: number; vte: number };
  audit: { adoptionRate: number };
  iteration: { misCases: number; retrained: number };
  suggestions: string[];
}

/**
 * 构建 AI 辅助 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns AI 辅助 V2 报告
 */
export function buildAIAssistReportV2(timeRange: string): AIAssistReportV2 {
  return {
    timeRange,
    cdss: { suggestions: 50000, adopted: 35000, modified: 5000 },
    medication: { alerts: 2000, interactions: 500, contraindications: 200 },
    emr: { autoWritten: 10000 },
    report: { interpreted: 20000 },
    pathway: { applied: 5000 },
    warning: { sepsis: 100, heartFailure: 80, vte: 150 },
    audit: { adoptionRate: 0.7 },
    iteration: { misCases: 100, retrained: 5 },
    suggestions: ['提高 CDSS 建议采纳率', '降低误报率'],
  };
}
