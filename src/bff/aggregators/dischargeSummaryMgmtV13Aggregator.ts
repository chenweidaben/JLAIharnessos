/**
 * 健澜科技 jlmedaios - 出院小结管理 V13 纯函数（M411-D，M411 收官）
 *
 * computeDischargeSummaryTimelyRateV13 / computeDischargeSummaryPassRateV13 / computeDischargeGuidanceCompletenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院小结管理记录 */
export interface DischargeSummaryMgmtRecordV13 {
  timely: number;
  dischargeTotal: number;
  qualified: number;
  summaryTotal: number;
  complete: number;
  shouldTotal: number;
}

/**
 * 出院小结及时率（纯函数）：及时完成数/出院总数×100，保留 2 位小数。
 *
 * @param records 出院小结管理记录列表
 * @returns 出院小结及时率百分比
 */
export function computeDischargeSummaryTimelyRateV13(records: DischargeSummaryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 出院小结合格率（纯函数）：合格份数/出院小结总数×100，保留 2 位小数。
 *
 * @param records 出院小结管理记录列表
 * @returns 出院小结合格率百分比
 */
export function computeDischargeSummaryPassRateV13(records: DischargeSummaryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.summaryTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 出院指导完整率（纯函数）：完整指导份数/应指导总数×100，保留 2 位小数。
 *
 * @param records 出院小结管理记录列表
 * @returns 出院指导完整率百分比
 */
export function computeDischargeGuidanceCompletenessRateV13(records: DischargeSummaryMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}
