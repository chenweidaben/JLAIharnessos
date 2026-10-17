/**
 * 健澜科技 jlmedaios - 患者满意度（得分）V13 纯函数（M365-A，stats/score避让）
 *
 * computeOverallSatisfactionV13 / computeOutpatientSatisfactionScoreV13 / computeInpatientSatisfactionScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者满意度（得分）记录 */
export interface PatientSatisfactionScoreRecordV13 {
  overallSatisfaction: number;
  outpatientSatisfaction: number;
  inpatientSatisfaction: number;
}

/**
 * 总体满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者满意度记录列表
 * @returns 总体满意度均值
 */
export function computeOverallSatisfactionV13(records: PatientSatisfactionScoreRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.overallSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 门诊满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者满意度记录列表
 * @returns 门诊满意度均值
 */
export function computeOutpatientSatisfactionScoreV13(records: PatientSatisfactionScoreRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.outpatientSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 住院满意度（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者满意度记录列表
 * @returns 住院满意度均值
 */
export function computeInpatientSatisfactionScoreV13(records: PatientSatisfactionScoreRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.inpatientSatisfaction, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
