/**
 * 健澜科技 jlmedaios - 门诊等候时长 V13 纯函数（M337-A）
 *
 * computeRegistrationWaitV13 / computeTriageWaitV13 / computePaymentWaitV13 / computePharmacyWaitV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊等候记录 */
export interface OutpatientWaitRecordV13 {
  registrationWaitMinutes: number;
  triageWaitMinutes: number;
  paymentWaitMinutes: number;
  pharmacyWaitMinutes: number;
}

/**
 * 挂号平均等候（纯函数）：均值，保留 1 位小数。
 *
 * @param records 门诊等候记录列表
 * @returns 挂号平均等候（分钟）
 */
export function computeRegistrationWaitV13(records: OutpatientWaitRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.registrationWaitMinutes, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 候诊平均等候（纯函数）：均值，保留 1 位小数。
 *
 * @param records 门诊等候记录列表
 * @returns 候诊平均等候（分钟）
 */
export function computeTriageWaitV13(records: OutpatientWaitRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.triageWaitMinutes, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 缴费平均等候（纯函数）：均值，保留 1 位小数。
 *
 * @param records 门诊等候记录列表
 * @returns 缴费平均等候（分钟）
 */
export function computePaymentWaitV13(records: OutpatientWaitRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.paymentWaitMinutes, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 取药平均等候（纯函数）：均值，保留 1 位小数。
 *
 * @param records 门诊等候记录列表
 * @returns 取药平均等候（分钟）
 */
export function computePharmacyWaitV13(records: OutpatientWaitRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.pharmacyWaitMinutes, 0);
  return Math.round((total / records.length) * 10) / 10;
}
