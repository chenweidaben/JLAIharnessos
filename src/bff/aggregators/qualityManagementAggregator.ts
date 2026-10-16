/**
 * 健澜科技 jlmedaios - 医院质量管理体系纯函数（M189-C）
 *
 * buildQualityManagementReport / scoreMedicalQuality / generatePDCAImprovement
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医疗质量数据 */
export interface MedicalQualityData {
  cureRate: number;
  improvementRate: number;
  criticalSuccessRate: number;
  gradeAChartRate: number;
}

/**
 * 医疗质量评分（纯函数）。
 *
 * @param data 医疗质量数据
 * @returns 0-100 分
 */
export function scoreMedicalQuality(data: MedicalQualityData): number {
  const score =
    data.cureRate * 25 +
    data.improvementRate * 25 +
    data.criticalSuccessRate * 25 +
    data.gradeAChartRate * 25;
  return Math.round(score);
}

/**
 * PDCA 改进建议生成（纯函数）。
 *
 * @param score 质量得分
 * @returns PDCA 建议列表
 */
export function generatePDCAImprovement(score: number): string[] {
  const suggestions: string[] = [];
  if (score < 80) {
    suggestions.push('Plan: 制定质量改进目标，成立专项小组');
    suggestions.push('Do: 实施改进措施，加强培训');
    suggestions.push('Check: 月度检查改进效果');
    suggestions.push('Act: 标准化改进流程，持续迭代');
  } else {
    suggestions.push('质量达标，保持当前水平');
  }
  return suggestions;
}

/** 质量报告输出 */
export interface QualityManagementReport {
  dept: string;
  timeRange: string;
  medicalScore: number;
  nursingQuality: { passRate: number; pressureUlcerRate: number; fallRate: number };
  medtechQuality: { reportAccuracy: number };
  serviceQuality: { satisfaction: number; complaintRate: number };
  pdcaSuggestions: string[];
}

/**
 * 构建质量管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 质量报告
 */
export function buildQualityManagementReport(dept: string, timeRange: string): QualityManagementReport {
  const medData: MedicalQualityData = {
    cureRate: 0.85,
    improvementRate: 0.9,
    criticalSuccessRate: 0.88,
    gradeAChartRate: 0.92,
  };

  const medicalScore = scoreMedicalQuality(medData);

  return {
    dept,
    timeRange,
    medicalScore,
    nursingQuality: { passRate: 0.95, pressureUlcerRate: 0.012, fallRate: 0.008 },
    medtechQuality: { reportAccuracy: 0.98 },
    serviceQuality: { satisfaction: 0.92, complaintRate: 0.015 },
    pdcaSuggestions: generatePDCAImprovement(medicalScore),
  };
}
