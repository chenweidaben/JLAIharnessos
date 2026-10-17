/**
 * 健澜科技 jlmedaios - 中医服务 V13 纯函数（M350-A）
 *
 * computeTcmOutpatientVisitsV13 / computeTcmInpatientRatioV13 / computeNonDrugTherapyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 中医服务记录 */
export interface TcmServiceRecordV13 {
  tcmOutpatientVisits: number;
  tcmBedDays: number;
  totalBedDays: number;
  nonDrugTherapyCount: number;
}

/**
 * 中医门诊人次（纯函数）：求和。
 *
 * @param records 中医服务记录列表
 * @returns 中医门诊人次
 */
export function computeTcmOutpatientVisitsV13(records: TcmServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.tcmOutpatientVisits, 0);
}

/**
 * 中医病房占比（纯函数）：中医床日/总床日×100，保留 2 位小数。
 *
 * @param records 中医服务记录列表
 * @returns 中医病房占比百分比
 */
export function computeTcmInpatientRatioV13(records: TcmServiceRecordV13[]): number {
  const tcmBedDays = records.reduce((acc, r) => acc + r.tcmBedDays, 0);
  const totalBedDays = records.reduce((acc, r) => acc + r.totalBedDays, 0);
  if (totalBedDays === 0) return 0;
  return Math.round((tcmBedDays / totalBedDays) * 10000) / 100;
}

/**
 * 非药物疗法使用率（纯函数）：非药物疗法数/中医门诊人次×100，保留 2 位小数。
 *
 * @param records 中医服务记录列表
 * @returns 非药物疗法使用率百分比
 */
export function computeNonDrugTherapyRateV13(records: TcmServiceRecordV13[]): number {
  const nonDrug = records.reduce((acc, r) => acc + r.nonDrugTherapyCount, 0);
  const outpatient = records.reduce((acc, r) => acc + r.tcmOutpatientVisits, 0);
  if (outpatient === 0) return 0;
  return Math.round((nonDrug / outpatient) * 10000) / 100;
}
