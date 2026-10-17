/**
 * 健澜科技 jlmedaios - 再入院管理 V13 纯函数（M411-B）
 *
 * compute31DayReadmissionRateV13 / compute15DayReadmissionRateV13 / computeReadmissionCauseAnalysisCompletionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 再入院管理记录 */
export interface ReadmissionMgmtRecordV13 {
  readmit31: number;
  readmit15: number;
  dischargeTotal: number;
  analyzed: number;
  readmitTotal: number;
}

/**
 * 31天再入院率（纯函数）：31天内再入院人数/出院总人数×100，保留 2 位小数。
 *
 * @param records 再入院管理记录列表
 * @returns 31天再入院率百分比
 */
export function compute31DayReadmissionRateV13(records: ReadmissionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const readmit31 = records.reduce((acc, r) => acc + r.readmit31, 0);
  return Math.round((readmit31 / total) * 10000) / 100;
}

/**
 * 15天再入院率（纯函数）：15天内再入院人数/出院总人数×100，保留 2 位小数。
 *
 * @param records 再入院管理记录列表
 * @returns 15天再入院率百分比
 */
export function compute15DayReadmissionRateV13(records: ReadmissionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.dischargeTotal, 0);
  if (total === 0) return 0;
  const readmit15 = records.reduce((acc, r) => acc + r.readmit15, 0);
  return Math.round((readmit15 / total) * 10000) / 100;
}

/**
 * 再入院原因分析完成率（纯函数）：已完成分析数/再入院总数×100，保留 2 位小数。
 *
 * @param records 再入院管理记录列表
 * @returns 再入院原因分析完成率百分比
 */
export function computeReadmissionCauseAnalysisCompletionRateV13(records: ReadmissionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.readmitTotal, 0);
  if (total === 0) return 0;
  const analyzed = records.reduce((acc, r) => acc + r.analyzed, 0);
  return Math.round((analyzed / total) * 10000) / 100;
}
