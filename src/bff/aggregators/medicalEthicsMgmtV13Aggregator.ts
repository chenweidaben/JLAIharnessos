/**
 * 健澜科技 jlmedaios - 医学伦理管理 V13 纯函数（M420-C）
 *
 * computeEthicsReviewProjectCountV13 / computeEthicsConsultationResponseRateV13 / computeSubjectProtectionComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医学伦理管理记录 */
export interface MedicalEthicsMgmtRecordV13 {
  reviewProjects: number;
  consultationResponded: number;
  consultationTotal: number;
  subjectProtectionCompliant: number;
  reviewProjectTotal: number;
}

/**
 * 伦理审查项目数（纯函数）：累计审查项目数求和，返回整数。
 *
 * @param records 医学伦理管理记录列表
 * @returns 伦理审查项目数（整数）
 */
export function computeEthicsReviewProjectCountV13(records: MedicalEthicsMgmtRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.reviewProjects, 0);
}

/**
 * 伦理咨询响应率（纯函数）：响应咨询数/咨询总数×100，保留 2 位小数。
 *
 * @param records 医学伦理管理记录列表
 * @returns 伦理咨询响应率百分比
 */
export function computeEthicsConsultationResponseRateV13(records: MedicalEthicsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.consultationTotal, 0);
  if (total === 0) return 0;
  const consultationResponded = records.reduce((acc, r) => acc + r.consultationResponded, 0);
  return Math.round((consultationResponded / total) * 10000) / 100;
}

/**
 * 受试者保护合规率（纯函数）：合规项目数/审查项目总数×100，保留 2 位小数。
 *
 * @param records 医学伦理管理记录列表
 * @returns 受试者保护合规率百分比
 */
export function computeSubjectProtectionComplianceRateV13(records: MedicalEthicsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.reviewProjectTotal, 0);
  if (total === 0) return 0;
  const subjectProtectionCompliant = records.reduce((acc, r) => acc + r.subjectProtectionCompliant, 0);
  return Math.round((subjectProtectionCompliant / total) * 10000) / 100;
}
