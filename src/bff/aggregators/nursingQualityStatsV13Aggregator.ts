/**
 * 健澜科技 jlmedaios - 护理质量（统计）V13 纯函数（M369-A，stats避让）
 *
 * computeNursingPassRateV13 / computeBasicNursingPassRateV13 / computeSpecialNursingPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理质量（统计）记录 */
export interface NursingQualityStatsRecordV13 {
  totalCheck: number;
  totalPass: number;
  basicCheck: number;
  basicPass: number;
  specialCheck: number;
  specialPass: number;
}

/**
 * 护理合格率（纯函数）：合格数/检查数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 护理合格率百分比
 */
export function computeNursingPassRateV13(records: NursingQualityStatsRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCheck, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.totalPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 基础护理合格率（纯函数）：合格数/检查数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 基础护理合格率百分比
 */
export function computeBasicNursingPassRateV13(records: NursingQualityStatsRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.basicCheck, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.basicPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}

/**
 * 特级护理合格率（纯函数）：合格数/检查数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 特级护理合格率百分比
 */
export function computeSpecialNursingPassRateV13(records: NursingQualityStatsRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.specialCheck, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.specialPass, 0);
  return Math.round((pass / total) * 10000) / 100;
}
