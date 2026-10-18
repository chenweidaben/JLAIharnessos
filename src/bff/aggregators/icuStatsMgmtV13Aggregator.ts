/**
 * 健澜科技 jlmedaios - ICU 管理（统计视角）V13 纯函数（M454-D，M454 收官，门急诊与手术麻醉管理组）
 *
 * 避让说明：基础名 icuMgmtV13 已被早期切片占用（含 icuCareMgmtV13 care 后缀），
 * 本切片改用 -stats 维度后缀避让。
 *
 * computeIcuStatsBedUtilizationRateV13 / computeIcuStatsCriticalRescueSuccessRateV13 / computeIcuStatsAverageLengthOfStayV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICU 管理（统计视角）记录 */
export interface IcuStatsMgmtRecordV13 {
  usedBedDays: number;
  authorizedBedDays: number;
  success: number;
  totalCritical: number;
  icuLengthOfStay: number;
}

/**
 * ICU 床位使用率（纯函数）：ICU 使用床日数/ICU 编制床日数×100，保留 2 位小数。
 *
 * @param records ICU 管理（统计视角）记录列表
 * @returns ICU 床位使用率百分比
 */
export function computeIcuStatsBedUtilizationRateV13(records: IcuStatsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.authorizedBedDays, 0);
  if (total === 0) return 0;
  const used = records.reduce((acc, r) => acc + r.usedBedDays, 0);
  return Math.round((used / total) * 10000) / 100;
}

/**
 * 危重患者抢救成功率（纯函数）：抢救成功危重患者数/危重患者总数×100，保留 2 位小数。
 *
 * @param records ICU 管理（统计视角）记录列表
 * @returns 危重患者抢救成功率百分比
 */
export function computeIcuStatsCriticalRescueSuccessRateV13(records: IcuStatsMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCritical, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.success, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * ICU 平均住院日（纯函数，Math.ceil 整天）：avg(icuLengthOfStay) 向上取整到整天。
 *
 * @param records ICU 管理（统计视角）记录列表
 * @returns ICU 平均住院日（整天）
 */
export function computeIcuStatsAverageLengthOfStayV13(records: IcuStatsMgmtRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.icuLengthOfStay, 0);
  return Math.ceil(sum / records.length);
}
