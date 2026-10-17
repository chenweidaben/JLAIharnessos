/**
 * 健澜科技 jlmedaios - 新生儿 V13 纯函数（M349-B）
 *
 * computeLowApgarRatioV13 / computeLowBirthWeightRatioV13 / computeNICUTransferRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 新生儿记录 */
export interface NewbornCareRecordV13 {
  lowApgarCount: number;
  lowBirthWeightCount: number;
  nicuTransferCount: number;
  totalNewbornCount: number;
}

/**
 * Apgar 评分≤7 占比（纯函数）：Apgar≤7 数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿记录列表
 * @returns Apgar≤7 占比百分比
 */
export function computeLowApgarRatioV13(records: NewbornCareRecordV13[]): number {
  const lowApgar = records.reduce((acc, r) => acc + r.lowApgarCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalNewbornCount, 0);
  if (total === 0) return 0;
  return Math.round((lowApgar / total) * 10000) / 100;
}

/**
 * 低体重儿率（纯函数）：低体重数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿记录列表
 * @returns 低体重儿率百分比
 */
export function computeLowBirthWeightRatioV13(records: NewbornCareRecordV13[]): number {
  const lowWeight = records.reduce((acc, r) => acc + r.lowBirthWeightCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalNewbornCount, 0);
  if (total === 0) return 0;
  return Math.round((lowWeight / total) * 10000) / 100;
}

/**
 * NICU 转入率（纯函数）：转入数/新生儿总数×100，保留 2 位小数。
 *
 * @param records 新生儿记录列表
 * @returns NICU 转入率百分比
 */
export function computeNICUTransferRatioV13(records: NewbornCareRecordV13[]): number {
  const nicu = records.reduce((acc, r) => acc + r.nicuTransferCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalNewbornCount, 0);
  if (total === 0) return 0;
  return Math.round((nicu / total) * 10000) / 100;
}
