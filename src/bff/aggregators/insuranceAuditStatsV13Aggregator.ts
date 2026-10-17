/**
 * 健澜科技 jlmedaios - 医保审核统计 V13 纯函数（M382-B，stats 避让）
 *
 * computeInsuranceAuditCountV13 / computeAuditDeductionAmountV13 / computeViolationCaseCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医保审核统计记录 */
export interface InsuranceAuditRecordV13 {
  auditCount: number;
  deductionAmount: number;
  violationCaseCount: number;
}

/**
 * 医保审核人次（纯函数）：求和。
 *
 * @param records 医保审核统计记录列表
 * @returns 医保审核人次
 */
export function computeInsuranceAuditCountV13(records: InsuranceAuditRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.auditCount, 0);
}

/**
 * 审核扣款金额（纯函数）：求和，单位元。
 *
 * @param records 医保审核统计记录列表
 * @returns 审核扣款金额
 */
export function computeAuditDeductionAmountV13(records: InsuranceAuditRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.deductionAmount, 0);
}

/**
 * 违规案例数（纯函数）：求和。
 *
 * @param records 医保审核统计记录列表
 * @returns 违规案例数
 */
export function computeViolationCaseCountV13(records: InsuranceAuditRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.violationCaseCount, 0);
}
