/**
 * 健澜科技 jlmedaios - 价格管理 V13 纯函数（M375-D，M375 收官）
 *
 * computePriceItemCountV13 / computePriceAdjustmentExecutionRateV13 / computePriceComplaintCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 价格管理记录 */
export interface PriceManagementRecordV13 {
  priceItemCount: number;
  shouldAdjustCount: number;
  executedAdjustCount: number;
  complaintCount: number;
}

/**
 * 医疗服务价格项目数（纯函数）：求和。
 *
 * @param records 价格管理记录列表
 * @returns 医疗服务价格项目数
 */
export function computePriceItemCountV13(records: PriceManagementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.priceItemCount, 0);
}

/**
 * 价格调整执行率（纯函数）：已执行调整数/应调整数×100，保留 2 位小数。
 *
 * @param records 价格管理记录列表
 * @returns 价格调整执行率百分比
 */
export function computePriceAdjustmentExecutionRateV13(records: PriceManagementRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldAdjustCount, 0);
  if (should === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executedAdjustCount, 0);
  return Math.round((executed / should) * 10000) / 100;
}

/**
 * 价格投诉数（纯函数）：求和。
 *
 * @param records 价格管理记录列表
 * @returns 价格投诉数
 */
export function computePriceComplaintCountV13(records: PriceManagementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.complaintCount, 0);
}
