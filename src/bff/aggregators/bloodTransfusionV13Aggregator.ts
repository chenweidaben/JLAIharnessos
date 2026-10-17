/**
 * 健澜科技 jlmedaios - 输血率 V13 纯函数（M342-A）
 *
 * computeTransfusionRatePer1000V13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输血率记录 */
export interface BloodTransfusionRecordV13 {
  inpatientCount: number;
  transfusionCount: number;
}

/**
 * 住院患者千人输血率（纯函数）：输血人数×1000/住院患者数，保留 1 位小数。
 *
 * @param records 输血率记录列表
 * @returns 千人输血率（‰）
 */
export function computeTransfusionRatePer1000V13(records: BloodTransfusionRecordV13[]): number {
  const inpatients = records.reduce((acc, r) => acc + r.inpatientCount, 0);
  const transfusions = records.reduce((acc, r) => acc + r.transfusionCount, 0);
  if (inpatients === 0) return 0;
  return Math.round((transfusions * 1000 / inpatients) * 10) / 10;
}
