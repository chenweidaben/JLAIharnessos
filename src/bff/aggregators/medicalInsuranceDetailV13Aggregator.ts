/**
 * 健澜科技 jlmedaios - 医保管理明细 V13 纯函数（M398-C）
 *
 * computeMedicalInsuranceRejectionAmountV13 / computeMedicalInsuranceAuditDeductionV13 / computeMedicalInsuranceAssessmentScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医保管理明细记录 */
export interface MedicalInsuranceDetailRecordV13 {
  rejectionAmount: number;
  auditDeduction: number;
  assessmentScore: number;
}

/**
 * 医保拒付金额（纯函数）：求和，元。
 *
 * @param records 医保管理明细记录列表
 * @returns 医保拒付金额（元）
 */
export function computeMedicalInsuranceRejectionAmountV13(records: MedicalInsuranceDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.rejectionAmount, 0);
}

/**
 * 医保稽核扣款（纯函数）：求和，元。
 *
 * @param records 医保管理明细记录列表
 * @returns 医保稽核扣款（元）
 */
export function computeMedicalInsuranceAuditDeductionV13(records: MedicalInsuranceDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.auditDeduction, 0);
}

/**
 * 医保考核得分（纯函数）：平均得分，保留 2 位小数。
 *
 * @param records 医保管理明细记录列表
 * @returns 医保考核得分平均分
 */
export function computeMedicalInsuranceAssessmentScoreV13(records: MedicalInsuranceDetailRecordV13[]): number {
  if (records.length === 0) return 0;
  const avg = records.reduce((acc, r) => acc + r.assessmentScore, 0) / records.length;
  return Math.round(avg * 100) / 100;
}
