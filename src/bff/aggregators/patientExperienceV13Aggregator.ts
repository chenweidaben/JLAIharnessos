/**
 * 健澜科技 jlmedaios - 患者体验 V13 纯函数（M358-B）
 *
 * computeOutpatientSatisfactionV13 / computeInpatientSatisfactionV13 / computeDischargeFollowUpRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者体验记录 */
export interface PatientExperienceRecordV13 {
  outpatientSatisfaction: number;
  inpatientSatisfaction: number;
  dischargeFollowedUp: number;
  dischargeCount: number;
}

/**
 * 门诊患者满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者体验记录列表
 * @returns 门诊患者满意度均值
 */
export function computeOutpatientSatisfactionV13(records: PatientExperienceRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.outpatientSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 住院患者满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者体验记录列表
 * @returns 住院患者满意度均值
 */
export function computeInpatientSatisfactionV13(records: PatientExperienceRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.inpatientSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 出院后随访率（纯函数）：随访数/出院数×100，保留 2 位小数。
 *
 * @param records 患者体验记录列表
 * @returns 出院后随访率百分比
 */
export function computeDischargeFollowUpRateV13(records: PatientExperienceRecordV13[]): number {
  const followedUp = records.reduce((acc, r) => acc + r.dischargeFollowedUp, 0);
  const discharged = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharged === 0) return 0;
  return Math.round((followedUp / discharged) * 10000) / 100;
}
