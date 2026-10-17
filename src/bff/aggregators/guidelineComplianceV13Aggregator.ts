/**
 * 健澜科技 jlmedaios - 指南依从性 V13 纯函数（M333-B）
 *
 * computeHypertensionComplianceV13 / computeDiabetesComplianceV13 / computeCoronaryComplianceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 指南依从记录 */
export interface GuidelineRecordV13 {
  disease: string;
  totalPatients: number;
  compliantPatients: number;
}

/**
 * 高血压指南依从率（纯函数）：依从人数/总人数×100。
 *
 * @param records 指南依从记录列表
 * @returns 依从率百分比
 */
export function computeHypertensionComplianceV13(records: GuidelineRecordV13[]): number {
  const hypertension = records.filter((r) => r.disease === "高血压");
  const total = hypertension.reduce((acc, r) => acc + r.totalPatients, 0);
  const compliant = hypertension.reduce((acc, r) => acc + r.compliantPatients, 0);
  if (total === 0) return 0;
  return Math.round((compliant / total) * 100);
}

/**
 * 糖尿病指南依从率（纯函数）：依从人数/总人数×100。
 *
 * @param records 指南依从记录列表
 * @returns 依从率百分比
 */
export function computeDiabetesComplianceV13(records: GuidelineRecordV13[]): number {
  const diabetes = records.filter((r) => r.disease === "糖尿病");
  const total = diabetes.reduce((acc, r) => acc + r.totalPatients, 0);
  const compliant = diabetes.reduce((acc, r) => acc + r.compliantPatients, 0);
  if (total === 0) return 0;
  return Math.round((compliant / total) * 100);
}

/**
 * 冠心病指南依从率（纯函数）：依从人数/总人数×100。
 *
 * @param records 指南依从记录列表
 * @returns 依从率百分比
 */
export function computeCoronaryComplianceV13(records: GuidelineRecordV13[]): number {
  const coronary = records.filter((r) => r.disease === "冠心病");
  const total = coronary.reduce((acc, r) => acc + r.totalPatients, 0);
  const compliant = coronary.reduce((acc, r) => acc + r.compliantPatients, 0);
  if (total === 0) return 0;
  return Math.round((compliant / total) * 100);
}
