/**
 * 健澜科技 jlmedaios - 满意度调查明细 V13 纯函数（M400-B，避让旧版 satisfaction-survey）
 *
 * computeOutpatientSatisfactionRateV13 / computeInpatientSatisfactionRateV13 / computeCaregiverSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 满意度调查明细记录 */
export interface SatisfactionSurveyDetailRecordV13 {
  outpatientSatisfied: number;
  outpatientTotal: number;
  inpatientSatisfied: number;
  inpatientTotal: number;
  caregiverSatisfied: number;
  caregiverTotal: number;
}

/**
 * 门诊满意度（纯函数）：满意人数/调查总人数×100，保留 2 位小数。
 *
 * @param records 满意度调查明细记录列表
 * @returns 门诊满意度百分比
 */
export function computeOutpatientSatisfactionRateV13(records: SatisfactionSurveyDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.outpatientTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.outpatientSatisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 住院满意度（纯函数）：满意人数/调查总人数×100，保留 2 位小数。
 *
 * @param records 满意度调查明细记录列表
 * @returns 住院满意度百分比
 */
export function computeInpatientSatisfactionRateV13(records: SatisfactionSurveyDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.inpatientSatisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}

/**
 * 陪护满意度（纯函数）：满意人数/调查总人数×100，保留 2 位小数。
 *
 * @param records 满意度调查明细记录列表
 * @returns 陪护满意度百分比
 */
export function computeCaregiverSatisfactionRateV13(records: SatisfactionSurveyDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.caregiverTotal, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.caregiverSatisfied, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
