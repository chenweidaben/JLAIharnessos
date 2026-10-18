/**
 * 健澜科技 jlmedaios - 医疗服务价格管理 V13 纯函数（M445-B，医保物价与费用管理组）
 *
 * computePriceExecutionAccuracyRateV13 / computePriceAdjustmentTimelinessRateV13 / computePriceComplaintRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗服务价格管理记录 */
export interface PriceMgmtRecordV13 {
  accurate: number;
  totalChecked: number;
  timelyAdjusted: number;
  shouldAdjust: number;
  complaint: number;
  totalService: number;
}

/**
 * 价格执行准确率（纯函数）：准确执行价格项目数/抽查价格项目总数×100，保留 2 位小数。
 *
 * @param records 医疗服务价格管理记录列表
 * @returns 价格执行准确率百分比
 */
export function computePriceExecutionAccuracyRateV13(records: PriceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalChecked, 0);
  if (total === 0) return 0;
  const accurateCount = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurateCount / total) * 10000) / 100;
}

/**
 * 价格调整及时率（纯函数）：及时调整价格项目数/应调整价格项目总数×100，保留 2 位小数。
 *
 * @param records 医疗服务价格管理记录列表
 * @returns 价格调整及时率百分比
 */
export function computePriceAdjustmentTimelinessRateV13(records: PriceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAdjust, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyAdjusted, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 价格投诉率（纯函数，反向指标，越低越好）：价格投诉数/医疗服务总次数×100，保留 2 位小数。
 *
 * @param records 医疗服务价格管理记录列表
 * @returns 价格投诉率百分比
 */
export function computePriceComplaintRateV13(records: PriceMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalService, 0);
  if (total === 0) return 0;
  const complaintCount = records.reduce((acc, r) => acc + r.complaint, 0);
  return Math.round((complaintCount / total) * 10000) / 100;
}
