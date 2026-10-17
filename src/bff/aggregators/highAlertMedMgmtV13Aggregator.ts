/**
 * 健澜科技 jlmedaios - 高危药品管理 V13 纯函数（M424-B）
 *
 * computeHighAlertMedLabelRateV13 / computeHighAlertMedDoubleCheckRateV13 / computeHighAlertMedStorageComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 高危药品管理记录 */
export interface HighAlertMedMgmtRecordV13 {
  labeled: number;
  highAlertTotal: number;
  doubleChecked: number;
  prescriptionTotal: number;
  compliantPoint: number;
  storagePointTotal: number;
}

/**
 * 高危药品标识率（纯函数）：已标识高危药品数/高危药品总数×100，保留 2 位小数。
 *
 * @param records 高危药品管理记录列表
 * @returns 高危药品标识率百分比
 */
export function computeHighAlertMedLabelRateV13(records: HighAlertMedMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.highAlertTotal, 0);
  if (total === 0) return 0;
  const labeled = records.reduce((acc, r) => acc + r.labeled, 0);
  return Math.round((labeled / total) * 10000) / 100;
}

/**
 * 高危药品双人核对率（纯函数）：双人核对处方数/高危药品处方总数×100，保留 2 位小数。
 *
 * @param records 高危药品管理记录列表
 * @returns 高危药品双人核对率百分比
 */
export function computeHighAlertMedDoubleCheckRateV13(records: HighAlertMedMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.prescriptionTotal, 0);
  if (total === 0) return 0;
  const checked = records.reduce((acc, r) => acc + r.doubleChecked, 0);
  return Math.round((checked / total) * 10000) / 100;
}

/**
 * 高危药品存放合规率（纯函数）：合规存放点数/存放点总数×100，保留 2 位小数。
 *
 * @param records 高危药品管理记录列表
 * @returns 高危药品存放合规率百分比
 */
export function computeHighAlertMedStorageComplianceRateV13(records: HighAlertMedMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.storagePointTotal, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantPoint, 0);
  return Math.round((compliant / total) * 10000) / 100;
}
