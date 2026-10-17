/**
 * 健澜科技 jlmedaios - 患者满意度 V13 纯函数（M347-A，stats 避让已有 patientSatisfactionV13）
 *
 * computeOutpatientSatisfactionV13 / computeInpatientSatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 患者满意度记录 */
export interface PatientSatisfactionRecordV13 {
  outpatientScore: number;
  inpatientScore: number;
}

/**
 * 门诊满意度均分（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者满意度记录列表
 * @returns 门诊满意度均分
 */
export function computeOutpatientSatisfactionV13(records: PatientSatisfactionRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.outpatientScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 住院满意度均分（纯函数）：均值，保留 2 位小数。
 *
 * @param records 患者满意度记录列表
 * @returns 住院满意度均分
 */
export function computeInpatientSatisfactionV13(records: PatientSatisfactionRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.inpatientScore, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
