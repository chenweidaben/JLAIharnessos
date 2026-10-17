/**
 * 健澜科技 jlmedaios - 患者隐私保护 V13 纯函数（M363-B）
 *
 * computePrivacyLeakCountV13 / computePrivacyPolicyAwarenessRateV13 / computeSensitiveDataMaskingCoverageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者隐私保护记录 */
export interface PatientPrivacyRecordV13 {
  leakCount: number;
  awarenessCount: number;
  surveyCount: number;
  maskedFields: number;
  totalSensitiveFields: number;
}

/**
 * 隐私泄露事件数（纯函数）：求和。
 *
 * @param records 患者隐私保护记录列表
 * @returns 隐私泄露事件数
 */
export function computePrivacyLeakCountV13(records: PatientPrivacyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.leakCount, 0);
}

/**
 * 隐私政策知晓率（纯函数）：知晓人数/调查人数×100，保留 2 位小数。
 *
 * @param records 患者隐私保护记录列表
 * @returns 隐私政策知晓率百分比
 */
export function computePrivacyPolicyAwarenessRateV13(records: PatientPrivacyRecordV13[]): number {
  const aware = records.reduce((acc, r) => acc + r.awarenessCount, 0);
  const surveyed = records.reduce((acc, r) => acc + r.surveyCount, 0);
  if (surveyed === 0) return 0;
  return Math.round((aware / surveyed) * 10000) / 100;
}

/**
 * 敏感数据脱敏覆盖率（纯函数）：脱敏字段数/应脱敏字段数×100，保留 2 位小数。
 *
 * @param records 患者隐私保护记录列表
 * @returns 敏感数据脱敏覆盖率百分比
 */
export function computeSensitiveDataMaskingCoverageRateV13(records: PatientPrivacyRecordV13[]): number {
  const masked = records.reduce((acc, r) => acc + r.maskedFields, 0);
  const total = records.reduce((acc, r) => acc + r.totalSensitiveFields, 0);
  if (total === 0) return 0;
  return Math.round((masked / total) * 10000) / 100;
}
