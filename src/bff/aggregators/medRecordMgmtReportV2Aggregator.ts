/**
 * 健澜科技 jlmedaios - 病案管理 V2 纯函数（M225-D）
 *
 * buildMedRecordMgmtReportV2 / assessCodingAccuracy / calculateRecordGrade
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估编码准确率（纯函数）。
 *
 * @param coded 已编码数
 * @param reviewed 审核正确数
 * @returns 准确率
 */
export function assessCodingAccuracy(coded: number, reviewed: number): { rate: number; qualified: boolean } {
  const rate = coded > 0 ? Math.round((reviewed / coded) * 1000) / 10 : 0;
  return { rate, qualified: rate >= 95 };
}

/**
 * 计算病案甲级率（纯函数）。
 *
 * @param records 总病案数
 * @param defects 缺陷数
 * @returns 甲级率
 */
export function calculateRecordGrade(records: number, defects: number): { grade: string; excellent: boolean } {
  const rate = records > 0 ? Math.round(((records - defects) / records) * 1000) / 10 : 0;
  let grade = '乙级';
  if (rate >= 95) grade = '甲级';
  else if (rate < 90) grade = '丙级';
  return { grade, excellent: rate >= 95 };
}

/** 病案管理 V2 报告输出 */
export interface MedRecordMgmtReportV2 {
  timeRange: string;
  retrieval: { collected: number };
  filing: { archived: number };
  coding: { icd10: number; icd9: number };
  quality: { running: number; terminal: number; gradeA: number };
  copy: { requests: number };
  statistics: { reports: number };
  digitization: { scanned: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建病案管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 病案管理 V2 报告
 */
export function buildMedRecordMgmtReportV2(timeRange: string): MedRecordMgmtReportV2 {
  return {
    timeRange,
    retrieval: { collected: 8000 },
    filing: { archived: 7900 },
    coding: { icd10: 8000, icd9: 3000 },
    quality: { running: 7800, terminal: 7900, gradeA: 7600 },
    copy: { requests: 2000 },
    statistics: { reports: 500 },
    digitization: { scanned: 7900 },
    management: { satisfaction: 93 },
    suggestions: ['提高编码准确率', '推进病案数字化'],
  };
}
