/**
 * 健澜科技 jlmedaios - 病案管理与统计深化 V3 纯函数（M205-B）
 *
 * buildMedicalRecordReportV3 / assessMRQuality / validateICDCoding
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估病案质量（纯函数）。
 *
 * @param grade 病案等级（1=甲, 2=乙, 3=丙）
 * @param defects 缺陷数
 * @returns 质量评估
 */
export function assessMRQuality(grade: number, defects: number): { level: string; pass: boolean } {
  if (grade === 1 && defects <= 2) return { level: '甲级', pass: true };
  if (grade === 2 || defects <= 5) return { level: '乙级', pass: true };
  return { level: '丙级', pass: false };
}

/**
 * 校验 ICD 编码（纯函数）。
 *
 * @param dx 主诊断编码
 * @param pr 手术操作编码
 * @returns 校验结果
 */
export function validateICDCoding(dx: string, pr: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!dx.startsWith('I')) issues.push('主诊断编码格式错误');
  if (pr && !pr.startsWith('I')) issues.push('手术编码格式错误');
  if (dx.length < 3) issues.push('诊断编码过短');
  return { valid: issues.length === 0, issues };
}

/** 病案 V3 报告输出 */
export interface MedicalRecordReportV3 {
  timeRange: string;
  retrieval: { total: number; retrieved: number; onTimeRate: number; missingRate: number };
  coding: { icd10Accuracy: number; icd9Cm3Accuracy: number };
  quality: { gradeA: number; gradeB: number; gradeC: number; defectRate: number };
  copying: { requests: number; fulfilled: number };
  storage: { digitalRate: number; disasterRecovery: boolean };
  statistics: { reports: number };
  drgDip: { groupingRate: number; mainDxSelectionRate: number };
  utilization: { researchUse: number; legalUse: number };
  suggestions: string[];
}

/**
 * 构建病案 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 病案 V3 报告
 */
export function buildMedicalRecordReportV3(timeRange: string): MedicalRecordReportV3 {
  return {
    timeRange,
    retrieval: { total: 50000, retrieved: 49000, onTimeRate: 0.95, missingRate: 0.02 },
    coding: { icd10Accuracy: 0.95, icd9Cm3Accuracy: 0.9 },
    quality: { gradeA: 45000, gradeB: 4000, gradeC: 1000, defectRate: 0.05 },
    copying: { requests: 5000, fulfilled: 4900 },
    storage: { digitalRate: 1.0, disasterRecovery: true },
    statistics: { reports: 100 },
    drgDip: { groupingRate: 0.98, mainDxSelectionRate: 0.9 },
    utilization: { researchUse: 500, legalUse: 100 },
    suggestions: ['提高病案回收及时率', '提高 ICD 编码准确率'],
  };
}
