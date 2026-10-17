/**
 * 健澜科技 jlmedaios - 用药安全 V13 纯函数（M394-D，M394 收官）
 *
 * computeMedicationErrorRateV13 / computeHighAlertDrugMgmtRateV13 / computeMedicationErrorReportRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 用药安全记录 */
export interface MedicationSafetyRecordV13 {
  errorCount: number;
  administrationCount: number;
  managedDrugCount: number;
  highAlertDrugCount: number;
  reportedCount: number;
  totalErrorCount: number;
}

/**
 * 用药差错率（纯函数）：差错例数/给药总次数×100，保留 2 位小数。
 *
 * @param records 用药安全记录列表
 * @returns 用药差错率百分比
 */
export function computeMedicationErrorRateV13(records: MedicationSafetyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.administrationCount, 0);
  if (total === 0) return 0;
  const errors = records.reduce((acc, r) => acc + r.errorCount, 0);
  return Math.round((errors / total) * 10000) / 100;
}

/**
 * 高警示药品管理率（纯函数）：规范管理品种数/高警示药品总品种数×100，保留 2 位小数。
 *
 * @param records 用药安全记录列表
 * @returns 高警示药品管理率百分比
 */
export function computeHighAlertDrugMgmtRateV13(records: MedicationSafetyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.highAlertDrugCount, 0);
  if (total === 0) return 0;
  const managed = records.reduce((acc, r) => acc + r.managedDrugCount, 0);
  return Math.round((managed / total) * 10000) / 100;
}

/**
 * 给药错误上报率（纯函数）：已上报例数/差错总例数×100，保留 2 位小数。
 *
 * @param records 用药安全记录列表
 * @returns 给药错误上报率百分比
 */
export function computeMedicationErrorReportRateV13(records: MedicationSafetyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalErrorCount, 0);
  if (total === 0) return 0;
  const reported = records.reduce((acc, r) => acc + r.reportedCount, 0);
  return Math.round((reported / total) * 10000) / 100;
}
