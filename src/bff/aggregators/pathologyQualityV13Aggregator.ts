/**
 * 健澜科技 jlmedaios - 病理质量 V13 纯函数（M360-C）
 *
 * computePathologyReportTimelyRateV13 / computeClinicalPathologyConsistencyRateV13 / computeFrozenSectionTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理质量记录 */
export interface PathologyQualityRecordV13 {
  reportTimely: number;
  reportCount: number;
  consistencyPassed: number;
  consistencyCount: number;
  frozenTimely: number;
  frozenCount: number;
}

/**
 * 病理报告及时率（纯函数）：及时数/报告数×100，保留 2 位小数。
 *
 * @param records 病理质量记录列表
 * @returns 病理报告及时率百分比
 */
export function computePathologyReportTimelyRateV13(records: PathologyQualityRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.reportTimely, 0);
  const total = records.reduce((acc, r) => acc + r.reportCount, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 临床与病理诊断符合率（纯函数）：符合数/对比数×100，保留 2 位小数。
 *
 * @param records 病理质量记录列表
 * @returns 临床与病理诊断符合率百分比
 */
export function computeClinicalPathologyConsistencyRateV13(records: PathologyQualityRecordV13[]): number {
  const consistent = records.reduce((acc, r) => acc + r.consistencyPassed, 0);
  const total = records.reduce((acc, r) => acc + r.consistencyCount, 0);
  if (total === 0) return 0;
  return Math.round((consistent / total) * 10000) / 100;
}

/**
 * 术中冰冻诊断及时率（纯函数）：及时数/冰冻数×100，保留 2 位小数。
 *
 * @param records 病理质量记录列表
 * @returns 术中冰冻诊断及时率百分比
 */
export function computeFrozenSectionTimelyRateV13(records: PathologyQualityRecordV13[]): number {
  const timely = records.reduce((acc, r) => acc + r.frozenTimely, 0);
  const total = records.reduce((acc, r) => acc + r.frozenCount, 0);
  if (total === 0) return 0;
  return Math.round((timely / total) * 10000) / 100;
}
