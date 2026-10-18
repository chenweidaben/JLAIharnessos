/**
 * 健澜科技 jlmedaios - 手术麻醉管理 V13 纯函数（M454-C，门急诊与手术麻醉管理组）
 *
 * computeSurgeryAnesthesiaOnTimeStartRateV13 / computeSurgeryAnesthesiaPreAssessmentRateV13 / computeSurgeryAnesthesiaComplicationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手术麻醉管理记录 */
export interface SurgeryAnesthesiaMgmtRecordV13 {
  onTime: number;
  totalSurgery: number;
  assessed: number;
  totalAnesthesia: number;
  complication: number;
}

/**
 * 手术按时开台率（纯函数）：按时开台手术数/手术总数×100，保留 2 位小数。
 *
 * @param records 手术麻醉管理记录列表
 * @returns 手术按时开台率百分比
 */
export function computeSurgeryAnesthesiaOnTimeStartRateV13(records: SurgeryAnesthesiaMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurgery, 0);
  if (total === 0) return 0;
  const onTime = records.reduce((acc, r) => acc + r.onTime, 0);
  return Math.round((onTime / total) * 10000) / 100;
}

/**
 * 麻醉前评估完成率（纯函数）：已完成麻醉前评估数/麻醉总数×100，保留 2 位小数。
 *
 * @param records 手术麻醉管理记录列表
 * @returns 麻醉前评估完成率百分比
 */
export function computeSurgeryAnesthesiaPreAssessmentRateV13(records: SurgeryAnesthesiaMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAnesthesia, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 手术并发症发生率（纯函数，反向指标越低越好）：手术并发症数/手术总数×100，保留 2 位小数。
 *
 * @param records 手术麻醉管理记录列表
 * @returns 手术并发症发生率百分比
 */
export function computeSurgeryAnesthesiaComplicationRateV13(records: SurgeryAnesthesiaMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurgery, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complication, 0);
  return Math.round((complication / total) * 10000) / 100;
}
