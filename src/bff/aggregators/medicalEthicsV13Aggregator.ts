/**
 * 健澜科技 jlmedaios - 医德医风考评 V13 纯函数（M340-B）
 *
 * computeExcellentGoodRateV13 / computeCommendationCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医德医风考评记录 */
export interface MedicalEthicsRecordV13 {
  totalEvaluated: number;
  excellentGoodCount: number;
  commendationCount: number;
}

/**
 * 考评优良率（纯函数）：优良数/考评总数×100，保留 1 位小数。
 *
 * @param records 医德医风考评记录列表
 * @returns 优良率百分比
 */
export function computeExcellentGoodRateV13(records: MedicalEthicsRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalEvaluated, 0);
  const excellentGood = records.reduce((acc, r) => acc + r.excellentGoodCount, 0);
  if (total === 0) return 0;
  return Math.round((excellentGood / total) * 1000) / 10;
}

/**
 * 受表扬人次（纯函数）：求和。
 *
 * @param records 医德医风考评记录列表
 * @returns 受表扬人次
 */
export function computeCommendationCountV13(records: MedicalEthicsRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.commendationCount, 0);
}
