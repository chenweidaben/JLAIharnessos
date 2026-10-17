/**
 * 健澜科技 jlmedaios - 投诉率 V13 纯函数（M347-B）
 *
 * computeDischargedPatientComplaintRateV13 / computePerThousandInpatientDaysComplaintsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉率记录 */
export interface ComplaintRecordV13 {
  complaintCount: number;
  dischargedCount: number;
  inpatientDays: number;
}

/**
 * 出院患者投诉率（纯函数）：投诉数/出院数×1000（‰），保留 2 位小数。
 *
 * @param records 投诉率记录列表
 * @returns 出院患者投诉率（‰）
 */
export function computeDischargedPatientComplaintRateV13(records: ComplaintRecordV13[]): number {
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  const discharged = records.reduce((acc, r) => acc + r.dischargedCount, 0);
  if (discharged === 0) return 0;
  return Math.round((complaints / discharged) * 100000) / 100;
}

/**
 * 千住院日投诉数（纯函数）：投诉数/住院日数×1000，保留 2 位小数。
 *
 * @param records 投诉率记录列表
 * @returns 千住院日投诉数
 */
export function computePerThousandInpatientDaysComplaintsV13(records: ComplaintRecordV13[]): number {
  const complaints = records.reduce((acc, r) => acc + r.complaintCount, 0);
  const days = records.reduce((acc, r) => acc + r.inpatientDays, 0);
  if (days === 0) return 0;
  return Math.round((complaints / days) * 100000) / 100;
}
