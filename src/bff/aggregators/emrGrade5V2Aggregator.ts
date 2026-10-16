/**
 * 健澜科技 jlmedaios - 电子病历五级评审 V2 纯函数（M187-C）
 *
 * buildEMRGrade5Assessment / scoreDimension / generateImprovementSuggestions
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type DimensionKeyV2 =
  | 'medical_quality'
  | 'nursing'
  | 'medtech'
  | 'patient_service'
  | 'operation'
  | 'data_quality'
  | 'security'
  | 'interconnect';

export const DIMENSIONS_V2: Array<{ key: DimensionKeyV2; name: string; maxScore: number }> = [
  { key: 'medical_quality', name: '医疗质量', maxScore: 100 },
  { key: 'nursing', name: '护理管理', maxScore: 100 },
  { key: 'medtech', name: '医技管理', maxScore: 100 },
  { key: 'patient_service', name: '患者服务', maxScore: 100 },
  { key: 'operation', name: '运营管理', maxScore: 100 },
  { key: 'data_quality', name: '数据质量', maxScore: 100 },
  { key: 'security', name: '信息安全', maxScore: 100 },
  { key: 'interconnect', name: '互联互通', maxScore: 100 },
];

/**
 * 维度评分（纯函数）。
 *
 * @param dimension 维度 key
 * @param data 该维度实际数据（0-1 完成度）
 * @returns 得分（0-100）
 */
export function scoreDimension(dimension: DimensionKeyV2, data: Record<string, number>): number {
  const items = Object.values(data);
  if (items.length === 0) return 0;
  const avg = items.reduce((a, b) => a + b, 0) / items.length;
  return Math.round(avg * 100);
}

/**
 * 整改建议生成（纯函数）。
 *
 * @param scores 各维度得分
 * @returns 低分维度的整改建议
 */
export function generateImprovementSuggestions(scores: Record<DimensionKeyV2, number>): string[] {
  const suggestions: string[] = [];
  for (const dim of DIMENSIONS_V2) {
    const score = scores[dim.key];
    if (score < 80) {
      suggestions.push(`${dim.name}（${score}分）：低于80分目标，建议专项整改`);
    }
  }
  if (suggestions.length === 0) {
    suggestions.push('各维度均达标，保持当前水平');
  }
  return suggestions;
}

export interface EMRGrade5ReportV2 {
  dept: string;
  timeRange: string;
  scores: Record<DimensionKeyV2, number>;
  totalScore: number;
  benchmark: { tertiary: number; secondary: number; primary: number };
  suggestions: string[];
}

/**
 * 构建 EMR 五级评审 V2 报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 评审报告
 */
export function buildEMRGrade5Assessment(dept: string, timeRange: string): EMRGrade5ReportV2 {
  const sampleData: Record<DimensionKeyV2, Record<string, number>> = {
    medical_quality: { completeness: 0.92, timeliness: 0.88 },
    nursing: { recordQuality: 0.85, compliance: 0.9 },
    medtech: { reportTimeliness: 0.9, accuracy: 0.87 },
    patient_service: { satisfaction: 0.93, complaintRate: 0.8 },
    operation: { bedTurnover: 0.82, losControl: 0.78 },
    data_quality: { completeness: 0.95, consistency: 0.91 },
    security: { accessControl: 0.98, audit: 0.96 },
    interconnect: { hl7: 0.85, cda: 0.8 },
  };

  const scores = {} as Record<DimensionKeyV2, number>;
  for (const dim of DIMENSIONS_V2) {
    scores[dim.key] = scoreDimension(dim.key, sampleData[dim.key]);
  }

  const totalScore = Math.round(
    DIMENSIONS_V2.reduce((sum, d) => sum + scores[d.key], 0) / DIMENSIONS_V2.length,
  );

  return {
    dept,
    timeRange,
    scores,
    totalScore,
    benchmark: { tertiary: 90, secondary: 75, primary: 60 },
    suggestions: generateImprovementSuggestions(scores),
  };
}
