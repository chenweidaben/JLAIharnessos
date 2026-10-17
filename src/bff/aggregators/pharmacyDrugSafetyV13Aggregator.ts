/**
 * 健澜科技 jlmedaios - 药品安全 V13 纯函数（M406-D，M406 收官）
 *
 * computeDrugRecallResponseTimeV13 / computeExpiredDrugDisposalRateV13 / computeNarcoticPsychotropicDrugAccountMatchRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药品安全记录 */
export interface PharmacyDrugSafetyRecordV13 {
  recallHours: number;
  disposed: number;
  expired: number;
  matched: number;
  totalStock: number;
}

/**
 * 药品召回响应时长（纯函数）：平均值，单位小时，Math.ceil 向上取整到整小时。
 *
 * @param records 药品安全记录列表
 * @returns 药品召回响应时长（整小时）
 */
export function computeDrugRecallResponseTimeV13(records: PharmacyDrugSafetyRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.recallHours, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}

/**
 * 过期药品处置率（纯函数）：已处置过期药品数/过期药品总数×100，保留 2 位小数。
 *
 * @param records 药品安全记录列表
 * @returns 过期药品处置率百分比
 */
export function computeExpiredDrugDisposalRateV13(records: PharmacyDrugSafetyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.expired, 0);
  if (total === 0) return 0;
  const disposed = records.reduce((acc, r) => acc + r.disposed, 0);
  return Math.round((disposed / total) * 10000) / 100;
}

/**
 * 麻精药品账物相符率（纯函数）：账物相符次数/盘点总次数×100，保留 2 位小数。
 *
 * @param records 药品安全记录列表
 * @returns 麻精药品账物相符率百分比
 */
export function computeNarcoticPsychotropicDrugAccountMatchRateV13(records: PharmacyDrugSafetyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalStock, 0);
  if (total === 0) return 0;
  const matched = records.reduce((acc, r) => acc + r.matched, 0);
  return Math.round((matched / total) * 10000) / 100;
}
