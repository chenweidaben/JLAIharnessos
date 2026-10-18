/**
 * 健澜科技 jlmedaios - 门诊收费管理 V13 纯函数（M448-A，财务与收费管理组）
 *
 * computeOutpatientBillingAccuracyRateV13 / computeOutpatientBillingRefundRateV13 / computeOutpatientBillingResponseMinutesV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊收费管理记录 */
export interface OutpatientBillingMgmtRecordV13 {
  accurate: number;
  refund: number;
  total: number;
  avgResponseMinutes: number;
}

/**
 * 门诊收费准确率（纯函数）：准确收费笔数/收费总笔数×100，保留 2 位小数。
 *
 * @param records 门诊收费管理记录列表
 * @returns 门诊收费准确率百分比
 */
export function computeOutpatientBillingAccuracyRateV13(records: OutpatientBillingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const accurateCount = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurateCount / total) * 10000) / 100;
}

/**
 * 门诊退费率（纯函数，反向指标越低越好）：退费笔数/收费总笔数×100，保留 2 位小数。
 *
 * @param records 门诊收费管理记录列表
 * @returns 门诊退费率百分比
 */
export function computeOutpatientBillingRefundRateV13(records: OutpatientBillingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const refundCount = records.reduce((acc, r) => acc + r.refund, 0);
  return Math.round((refundCount / total) * 10000) / 100;
}

/**
 * 门诊收费响应时长（纯函数，平均时长指标）：平均响应时长，单位分钟，Math.ceil(avg) 整分钟。
 *
 * @param records 门诊收费管理记录列表
 * @returns 门诊收费响应时长（整分钟，整数）
 */
export function computeOutpatientBillingResponseMinutesV13(records: OutpatientBillingMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.avgResponseMinutes, 0);
  const avg = sum / records.length;
  return Math.ceil(avg);
}
