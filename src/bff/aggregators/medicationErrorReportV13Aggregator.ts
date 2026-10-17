/**
 * 健澜科技 jlmedaios - 用药错误上报 V13 纯函数（M424-A，换名避让旧版 patientSafetyMgmtV13（M418））
 *
 * computeMedicationErrorReportRateV13 / computeMedicationErrorMissingReportRateV13 / computeMedicationErrorRootCauseAnalysisRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 用药错误上报记录 */
export interface MedicationErrorReportRecordV13 {
  reported: number;
  actualTotal: number;
  missing: number;
  rcaCompleted: number;
  errorTotal: number;
}

/**
 * 用药错误上报率（纯函数）：上报用药错误数/实际发生用药错误总数×100，保留 2 位小数。
 *
 * @param records 用药错误上报记录列表
 * @returns 用药错误上报率百分比
 */
export function computeMedicationErrorReportRateV13(records: MedicationErrorReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.actualTotal, 0);
  if (total === 0) return 0;
  const reported = records.reduce((acc, r) => acc + r.reported, 0);
  return Math.round((reported / total) * 10000) / 100;
}

/**
 * 用药错误漏报率（纯函数，反向指标，值越低越好）：漏报数/实际发生用药错误总数×100，保留 2 位小数。
 *
 * @param records 用药错误上报记录列表
 * @returns 用药错误漏报率百分比
 */
export function computeMedicationErrorMissingReportRateV13(records: MedicationErrorReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.actualTotal, 0);
  if (total === 0) return 0;
  const missing = records.reduce((acc, r) => acc + r.missing, 0);
  return Math.round((missing / total) * 10000) / 100;
}

/**
 * 用药错误根因分析完成率（纯函数）：完成根因分析数/用药错误总数×100，保留 2 位小数。
 *
 * @param records 用药错误上报记录列表
 * @returns 用药错误根因分析完成率百分比
 */
export function computeMedicationErrorRootCauseAnalysisRateV13(records: MedicationErrorReportRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.errorTotal, 0);
  if (total === 0) return 0;
  const rca = records.reduce((acc, r) => acc + r.rcaCompleted, 0);
  return Math.round((rca / total) * 10000) / 100;
}
