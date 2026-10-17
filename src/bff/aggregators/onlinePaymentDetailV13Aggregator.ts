/**
 * 健澜科技 jlmedaios - 线上支付明细 V13 纯函数（M399-C，避让旧版 onlinePaymentV13）
 *
 * computeOnlinePaymentCountV13 / computeOnlinePaymentRatioV13 / computeRefundHandlingTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 线上支付明细记录 */
export interface OnlinePaymentDetailRecordV13 {
  onlineCount: number;
  totalCount: number;
  timelyRefundCount: number;
  totalRefundCount: number;
}

/**
 * 线上缴费笔数（纯函数）：求和。
 *
 * @param records 线上支付明细记录列表
 * @returns 线上缴费笔数
 */
export function computeOnlinePaymentCountV13(records: OnlinePaymentDetailRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.onlineCount, 0);
}

/**
 * 线上缴费占比（纯函数）：线上缴费笔数/总缴费笔数×100，保留 2 位小数。
 *
 * @param records 线上支付明细记录列表
 * @returns 线上缴费占比百分比
 */
export function computeOnlinePaymentRatioV13(records: OnlinePaymentDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const online = records.reduce((acc, r) => acc + r.onlineCount, 0);
  return Math.round((online / total) * 10000) / 100;
}

/**
 * 退费处理及时率（纯函数）：及时处理笔数/退费总笔数×100，保留 2 位小数。
 *
 * @param records 线上支付明细记录列表
 * @returns 退费处理及时率百分比
 */
export function computeRefundHandlingTimelyRateV13(records: OnlinePaymentDetailRecordV13[]): number {
  const totalRefund = records.reduce((acc, r) => acc + r.totalRefundCount, 0);
  if (totalRefund === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyRefundCount, 0);
  return Math.round((timely / totalRefund) * 10000) / 100;
}
