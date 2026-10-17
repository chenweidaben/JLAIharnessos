/**
 * 健澜科技 jlmedaios - 出院小结管理（细节）V13 纯函数（M427-A，detail 避让旧版 dischargeSummaryMgmtV13（M411））
 *
 * computeDischargeSummaryCompleteRateV13 / computeDischargeSummaryTimelyRateV13 / computeDischargeSummaryPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院小结管理（细节）记录 */
export interface DischargeSummaryDetailRecordV13 {
  completeDs: number;
  timelyDs: number;
  passDs: number;
  dischargeTotal: number;
}

/**
 * 出院小结完整率（纯函数）：完整出院小结数/出院总数×100，保留 2 位小数。
 *
 * @param records 出院小结管理（细节）记录列表
 * @returns 出院小结完整率百分比
 */
export function computeDischargeSummaryCompleteRateV13(records: DischargeSummaryDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.completeDs, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 出院小结及时率（纯函数）：及时完成出院小结数/出院总数×100，保留 2 位小数。
 *
 * @param records 出院小结管理（细节）记录列表
 * @returns 出院小结及时率百分比
 */
export function computeDischargeSummaryTimelyRateV13(records: DischargeSummaryDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyDs, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 出院小结合格率（纯函数）：合格出院小结数/出院总数×100，保留 2 位小数。
 *
 * @param records 出院小结管理（细节）记录列表
 * @returns 出院小结合格率百分比
 */
export function computeDischargeSummaryPassRateV13(records: DischargeSummaryDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const pass = records.reduce((acc, r) => acc + r.passDs, 0);
  return Math.round((pass / total) * 10000) / 100;
}
