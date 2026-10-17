/**
 * 健澜科技 jlmedaios - 随访管理 V13 纯函数（M400-C）
 *
 * computeDischargeFollowupRateV13 / computeChronicDiseaseFollowupRateV13 / computeHighRiskPatientFollowupRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 随访管理记录 */
export interface FollowUpMgmtRecordV13 {
  dischargeFollowed: number;
  dischargeTotal: number;
  chronicFollowed: number;
  chronicTotal: number;
  highRiskFollowed: number;
  highRiskTotal: number;
}

/**
 * 出院随访率（纯函数）：已随访人数/应随访出院人数×100，保留 2 位小数。
 *
 * @param records 随访管理记录列表
 * @returns 出院随访率百分比
 */
export function computeDischargeFollowupRateV13(records: FollowUpMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const followed = records.reduce((acc, r) => acc + r.dischargeFollowed, 0);
  return Math.round((followed / total) * 10000) / 100;
}

/**
 * 慢性病随访率（纯函数）：已随访人数/慢性病患者总数×100，保留 2 位小数。
 *
 * @param records 随访管理记录列表
 * @returns 慢性病随访率百分比
 */
export function computeChronicDiseaseFollowupRateV13(records: FollowUpMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.chronicTotal, 0);
  if (total === 0) return 0;
  const followed = records.reduce((acc, r) => acc + r.chronicFollowed, 0);
  return Math.round((followed / total) * 10000) / 100;
}

/**
 * 高危患者随访率（纯函数）：已随访人数/高危患者总数×100，保留 2 位小数。
 *
 * @param records 随访管理记录列表
 * @returns 高危患者随访率百分比
 */
export function computeHighRiskPatientFollowupRateV13(records: FollowUpMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.highRiskTotal, 0);
  if (total === 0) return 0;
  const followed = records.reduce((acc, r) => acc + r.highRiskFollowed, 0);
  return Math.round((followed / total) * 10000) / 100;
}
