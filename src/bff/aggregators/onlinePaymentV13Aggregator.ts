/**
 * 健澜科技 jlmedaios - 在线支付 V13 纯函数（M367-C）
 *
 * computeOnlinePaymentCountV13 / computeOnlinePaymentAmountV13 / computePaymentSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 在线支付记录 */
export interface OnlinePaymentRecordV13 {
  paymentCount: number;
  paymentAmount: number;
  paymentSuccess: number;
}

/**
 * 在线支付笔数（纯函数）：求和。
 *
 * @param records 在线支付记录列表
 * @returns 在线支付笔数
 */
export function computeOnlinePaymentCountV13(records: OnlinePaymentRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.paymentCount, 0);
}

/**
 * 在线支付金额（纯函数）：求和，单位元，保留 2 位小数。
 *
 * @param records 在线支付记录列表
 * @returns 在线支付金额（元）
 */
export function computeOnlinePaymentAmountV13(records: OnlinePaymentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.paymentAmount, 0);
  return Math.round(total * 100) / 100;
}

/**
 * 支付成功率（纯函数）：成功笔数/支付笔数×100，保留 2 位小数。
 *
 * @param records 在线支付记录列表
 * @returns 支付成功率百分比
 */
export function computePaymentSuccessRateV13(records: OnlinePaymentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.paymentCount, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.paymentSuccess, 0);
  return Math.round((success / total) * 10000) / 100;
}
