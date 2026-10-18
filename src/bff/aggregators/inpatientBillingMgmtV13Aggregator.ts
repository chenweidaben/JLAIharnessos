/**
 * 健澜科技 jlmedaios - 住院收费管理 V13 纯函数（M448-B，财务与收费管理组）
 *
 * computeInpatientBillingSettlementAccuracyRateV13 / computeInpatientBillingDepositSufficiencyRateV13 / computeInpatientBillingDischargeSettlementTimelinessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院收费管理记录 */
export interface InpatientBillingMgmtRecordV13 {
  accurate: number;
  totalSettle: number;
  sufficient: number;
  totalPatient: number;
  timely: number;
  totalDischarge: number;
}

/**
 * 住院费用结算准确率（纯函数）：准确结算笔数/结算总笔数×100，保留 2 位小数。
 *
 * @param records 住院收费管理记录列表
 * @returns 住院费用结算准确率百分比
 */
export function computeInpatientBillingSettlementAccuracyRateV13(records: InpatientBillingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSettle, 0);
  if (total === 0) return 0;
  const accurateCount = records.reduce((acc, r) => acc + r.accurate, 0);
  return Math.round((accurateCount / total) * 10000) / 100;
}

/**
 * 住院预交金充足率（纯函数）：预交金充足患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 住院收费管理记录列表
 * @returns 住院预交金充足率百分比
 */
export function computeInpatientBillingDepositSufficiencyRateV13(records: InpatientBillingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPatient, 0);
  if (total === 0) return 0;
  const sufficientCount = records.reduce((acc, r) => acc + r.sufficient, 0);
  return Math.round((sufficientCount / total) * 10000) / 100;
}

/**
 * 出院结算及时率（纯函数）：及时结算出院人数/出院总人数×100，保留 2 位小数。
 *
 * @param records 住院收费管理记录列表
 * @returns 出院结算及时率百分比
 */
export function computeInpatientBillingDischargeSettlementTimelinessRateV13(records: InpatientBillingMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDischarge, 0);
  if (total === 0) return 0;
  const timelyCount = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timelyCount / total) * 10000) / 100;
}
