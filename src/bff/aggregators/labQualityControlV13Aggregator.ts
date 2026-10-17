/**
 * 健澜科技 jlmedaios - 检验质控 V13 纯函数（M392-A）
 *
 * computeIQCQualificationRateV13 / computeEQAQQualificationRateV13 / computeCriticalValueReportTimelyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验质控记录 */
export interface LabQualityControlRecordV13 {
  iqcQualifiedCount: number;
  iqcTotalCount: number;
  eqaQualifiedCount: number;
  eqaTotalCount: number;
  timelyCount: number;
  criticalTotalCount: number;
}

/**
 * 室内质控合格率（纯函数）：合格项数/质控项总数×100，保留 2 位小数。
 *
 * @param records 检验质控记录列表
 * @returns 室内质控合格率百分比
 */
export function computeIQCQualificationRateV13(records: LabQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.iqcTotalCount, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.iqcQualifiedCount, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 室间质评合格率（纯函数）：合格项数/质评项总数×100，保留 2 位小数。
 *
 * @param records 检验质控记录列表
 * @returns 室间质评合格率百分比
 */
export function computeEQAQQualificationRateV13(records: LabQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.eqaTotalCount, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.eqaQualifiedCount, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 危急值报告及时率（纯函数）：及时报告数/危急值总数×100，保留 2 位小数。
 *
 * @param records 检验质控记录列表
 * @returns 危急值报告及时率百分比
 */
export function computeCriticalValueReportTimelyRateV13(records: LabQualityControlRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.criticalTotalCount, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyCount, 0);
  return Math.round((timely / total) * 10000) / 100;
}
