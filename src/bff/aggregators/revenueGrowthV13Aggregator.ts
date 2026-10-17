/**
 * 健澜科技 jlmedaios - 收入增长 V13 纯函数（M407-B）
 *
 * computeOutpatientRevenueGrowthRateV13 / computeInpatientRevenueGrowthRateV13 / computeMedicalServiceRevenueRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 收入增长记录 */
export interface RevenueGrowthRecordV13 {
  outpatientCurrent: number;
  outpatientPrevious: number;
  inpatientCurrent: number;
  inpatientPrevious: number;
  serviceRevenue: number;
  totalRevenue: number;
}

/**
 * 门诊收入增长率（纯函数）：(本期-上期)/上期×100，保留 2 位小数。
 *
 * 采用合计口径：sum(本期) / sum(上期) - 1。
 *
 * @param records 收入增长记录列表
 * @returns 门诊收入增长率百分比
 */
export function computeOutpatientRevenueGrowthRateV13(records: RevenueGrowthRecordV13[]): number {
  const prev = records.reduce((acc, r) => acc + r.outpatientPrevious, 0);
  if (prev === 0) return 0;
  const curr = records.reduce((acc, r) => acc + r.outpatientCurrent, 0);
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

/**
 * 住院收入增长率（纯函数）：(本期-上期)/上期×100，保留 2 位小数。
 *
 * 采用合计口径：sum(本期) / sum(上期) - 1。
 *
 * @param records 收入增长记录列表
 * @returns 住院收入增长率百分比
 */
export function computeInpatientRevenueGrowthRateV13(records: RevenueGrowthRecordV13[]): number {
  const prev = records.reduce((acc, r) => acc + r.inpatientPrevious, 0);
  if (prev === 0) return 0;
  const curr = records.reduce((acc, r) => acc + r.inpatientCurrent, 0);
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

/**
 * 医疗服务收入占比（纯函数）：医疗服务收入/医疗总收入×100，保留 2 位小数。
 *
 * @param records 收入增长记录列表
 * @returns 医疗服务收入占比百分比
 */
export function computeMedicalServiceRevenueRatioV13(records: RevenueGrowthRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  const service = records.reduce((acc, r) => acc + r.serviceRevenue, 0);
  return Math.round((service / total) * 10000) / 100;
}
