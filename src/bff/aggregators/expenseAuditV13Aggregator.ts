/**
 * 健澜科技 jlmedaios - 医疗费用审核 V13 纯函数（M445-C，医保物价与费用管理组）
 *
 * computeExpenseAuditDischargeRecordRateV13 / computeExpenseAuditUnreasonableProportionRateV13 / computeExpenseAuditAppealSuccessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗费用审核记录 */
export interface ExpenseAuditRecordV13 {
  audited: number;
  totalDischarge: number;
  unreasonableAmount: number;
  totalAuditedAmount: number;
  appealSuccess: number;
  totalAppeal: number;
}

/**
 * 出院病历审核率（纯函数）：已审核出院病历数/出院病历总数×100，保留 2 位小数。
 *
 * @param records 医疗费用审核记录列表
 * @returns 出院病历审核率百分比
 */
export function computeExpenseAuditDischargeRecordRateV13(records: ExpenseAuditRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDischarge, 0);
  if (total === 0) return 0;
  const auditedCount = records.reduce((acc, r) => acc + r.audited, 0);
  return Math.round((auditedCount / total) * 10000) / 100;
}

/**
 * 不合理费用占比（纯函数，反向指标，越低越好）：不合理费用金额/审核费用总金额×100，保留 2 位小数。
 *
 * @param records 医疗费用审核记录列表
 * @returns 不合理费用占比百分比
 */
export function computeExpenseAuditUnreasonableProportionRateV13(records: ExpenseAuditRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAuditedAmount, 0);
  if (total === 0) return 0;
  const unreasonable = records.reduce((acc, r) => acc + r.unreasonableAmount, 0);
  return Math.round((unreasonable / total) * 10000) / 100;
}

/**
 * 费用申诉成功率（纯函数）：申诉成功次数/申诉总次数×100，保留 2 位小数。
 *
 * @param records 医疗费用审核记录列表
 * @returns 费用申诉成功率百分比
 */
export function computeExpenseAuditAppealSuccessRateV13(records: ExpenseAuditRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAppeal, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.appealSuccess, 0);
  return Math.round((success / total) * 10000) / 100;
}
