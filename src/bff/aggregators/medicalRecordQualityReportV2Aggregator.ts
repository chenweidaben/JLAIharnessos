/**
 * 健澜科技 jlmedaios - 病历质量深化 V2 纯函数（M209-C）
 *
 * buildMedicalRecordQualityReportV2 / assessRecordQuality / validateHomePageData
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 缺陷列表 */
export interface RecordDefects {
  runtime: number;
  terminal: number;
  consent: number;
  signature: number;
}

/**
 * 评估病历质量（纯函数）。
 *
 * @param defects 缺陷
 * @returns 质量等级
 */
export function assessRecordQuality(defects: RecordDefects): { grade: string; defectRate: number } {
  const total = defects.runtime + defects.terminal + defects.consent + defects.signature;
  let grade = '甲级';
  if (total > 5) grade = '丙级';
  else if (total > 2) grade = '乙级';
  return { grade, defectRate: total / 100 };
}

/** 首页数据 */
export interface HomepageData {
  mainDiagnosis: string;
  mainProcedure: string;
  totalCost: number;
}

/**
 * 校验首页数据（纯函数）。
 *
 * @param homepage 首页数据
 * @returns 是否完整
 */
export function validateHomePageData(homepage: HomepageData): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!homepage.mainDiagnosis) missing.push('主诊断');
  if (!homepage.mainProcedure) missing.push('主手术');
  if (homepage.totalCost <= 0) missing.push('总费用');
  return { valid: missing.length === 0, missing };
}

/** 病历质量 V2 报告输出 */
export interface MedicalRecordQualityReportV2 {
  timeRange: string;
  runtime: { onTime: number; defects: number };
  terminal: { gradeA: number; gradeB: number; gradeC: number };
  connotation: { deepQC: number };
  emrRating: { level: number };
  homepage: { complete: number };
  copy: { requested: number };
  pdca: { closedLoop: number };
  suggestions: string[];
}

/**
 * 构建病历质量 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 病历质量 V2 报告
 */
export function buildMedicalRecordQualityReportV2(timeRange: string): MedicalRecordQualityReportV2 {
  return {
    timeRange,
    runtime: { onTime: 10000, defects: 100 },
    terminal: { gradeA: 9500, gradeB: 450, gradeC: 50 },
    connotation: { deepQC: 1000 },
    emrRating: { level: 5 },
    homepage: { complete: 9800 },
    copy: { requested: 500 },
    pdca: { closedLoop: 100 },
    suggestions: ['降低乙级病历率', '提高首页完整率'],
  };
}
