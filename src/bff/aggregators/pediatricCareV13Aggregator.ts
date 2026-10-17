/**
 * 健澜科技 jlmedaios - 儿科诊疗 V13 纯函数（M349-C）
 *
 * computeOutpatientVisitsV13 / computeInpatientVisitsV13 / computeNebulizationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 儿科诊疗记录 */
export interface PediatricCareRecordV13 {
  outpatientVisits: number;
  inpatientVisits: number;
  nebulizationCount: number;
}

/**
 * 门诊人次（纯函数）：求和。
 *
 * @param records 儿科诊疗记录列表
 * @returns 门诊人次
 */
export function computeOutpatientVisitsV13(records: PediatricCareRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.outpatientVisits, 0);
}

/**
 * 住院人次（纯函数）：求和。
 *
 * @param records 儿科诊疗记录列表
 * @returns 住院人次
 */
export function computeInpatientVisitsV13(records: PediatricCareRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.inpatientVisits, 0);
}

/**
 * 雾化治疗率（纯函数）：雾化数/门诊人次×100，保留 2 位小数。
 *
 * @param records 儿科诊疗记录列表
 * @returns 雾化治疗率百分比
 */
export function computeNebulizationRateV13(records: PediatricCareRecordV13[]): number {
  const nebulization = records.reduce((acc, r) => acc + r.nebulizationCount, 0);
  const outpatient = records.reduce((acc, r) => acc + r.outpatientVisits, 0);
  if (outpatient === 0) return 0;
  return Math.round((nebulization / outpatient) * 10000) / 100;
}
