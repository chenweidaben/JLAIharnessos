/**
 * 健澜科技 jlmedaios - 价格监控 V13 纯函数（M382-D，M382 收官）
 *
 * computeMedicalServicePriceItemCountV13 / computePriceAdjustmentCountV13 / computePriceComplaintCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 价格监控记录 */
export interface PriceMonitorRecordV13 {
  priceItemCount: number;
  priceAdjustmentCount: number;
  priceComplaintCount: number;
}

/**
 * 医疗服务价格项目数（纯函数）：求和。
 *
 * @param records 价格监控记录列表
 * @returns 医疗服务价格项目数
 */
export function computeMedicalServicePriceItemCountV13(records: PriceMonitorRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.priceItemCount, 0);
}

/**
 * 价格调整次数（纯函数）：求和。
 *
 * @param records 价格监控记录列表
 * @returns 价格调整次数
 */
export function computePriceAdjustmentCountV13(records: PriceMonitorRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.priceAdjustmentCount, 0);
}

/**
 * 价格投诉数（纯函数）：求和。
 *
 * @param records 价格监控记录列表
 * @returns 价格投诉数
 */
export function computePriceComplaintCountV13(records: PriceMonitorRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.priceComplaintCount, 0);
}
