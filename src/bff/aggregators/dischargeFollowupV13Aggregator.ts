/**
 * 健澜科技 jlmedaios - 出院随访 V13 纯函数（M373-D，M373 收官）
 *
 * computeDischargeFollowupRateV13 / computeFollowupCompletionRateV13 / computeFollowupPatientSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 出院随访记录 */
export interface DischargeFollowupRecordV13 {
  dischargeCount: number;
  followupCount: number;
  shouldFollowupCount: number;
  completedFollowupCount: number;
  satisfactionCount: number;
}

/**
 * 出院随访率（纯函数）：随访人数/出院人数×100，保留 2 位小数。
 *
 * @param records 出院随访记录列表
 * @returns 出院随访率百分比
 */
export function computeDischargeFollowupRateV13(records: DischargeFollowupRecordV13[]): number {
  const discharge = records.reduce((acc, r) => acc + r.dischargeCount, 0);
  if (discharge === 0) return 0;
  const followup = records.reduce((acc, r) => acc + r.followupCount, 0);
  return Math.round((followup / discharge) * 10000) / 100;
}

/**
 * 随访完成率（纯函数）：完成数/应随访数×100，保留 2 位小数。
 *
 * @param records 出院随访记录列表
 * @returns 随访完成率百分比
 */
export function computeFollowupCompletionRateV13(records: DischargeFollowupRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldFollowupCount, 0);
  if (should === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedFollowupCount, 0);
  return Math.round((completed / should) * 10000) / 100;
}

/**
 * 随访患者满意度（纯函数）：满意数/随访数×100，保留 2 位小数。
 *
 * @param records 出院随访记录列表
 * @returns 随访患者满意度百分比
 */
export function computeFollowupPatientSatisfactionRateV13(records: DischargeFollowupRecordV13[]): number {
  const followup = records.reduce((acc, r) => acc + r.followupCount, 0);
  if (followup === 0) return 0;
  const satisfaction = records.reduce((acc, r) => acc + r.satisfactionCount, 0);
  return Math.round((satisfaction / followup) * 10000) / 100;
}
