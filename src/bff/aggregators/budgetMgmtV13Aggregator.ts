/**
 * 健澜科技 jlmedaios - 财务预算管理 V13 纯函数（M448-C，财务与收费管理组）
 *
 * computeBudgetExecutionRateV13 / computeBudgetDeviationRateV13 / computeBudgetAdjustmentApprovalComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 财务预算管理记录 */
export interface BudgetMgmtRecordV13 {
  executed: number;
  totalBudget: number;
  actual: number;
  budgetAmount: number;
  compliant: number;
  totalAdjustment: number;
}

/**
 * 预算执行率（纯函数）：已执行预算金额/预算总额×100，保留 2 位小数。
 *
 * @param records 财务预算管理记录列表
 * @returns 预算执行率百分比
 */
export function computeBudgetExecutionRateV13(records: BudgetMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBudget, 0);
  if (total === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executed, 0);
  return Math.round((executed / total) * 10000) / 100;
}

/**
 * 预算偏差率（纯函数，反向指标越低越好）：|实际执行-预算|/预算×100，保留 2 位小数。
 *
 * @param records 财务预算管理记录列表
 * @returns 预算偏差率百分比
 */
export function computeBudgetDeviationRateV13(records: BudgetMgmtRecordV13[]): number {
  const totalBudget = records.reduce((acc, r) => acc + r.budgetAmount, 0);
  if (totalBudget === 0) return 0;
  const totalActual = records.reduce((acc, r) => acc + r.actual, 0);
  const deviation = Math.abs(totalActual - totalBudget);
  return Math.round((deviation / totalBudget) * 10000) / 100;
}

/**
 * 预算调整审批合规率（纯函数）：合规调整次数/调整总次数×100，保留 2 位小数。
 *
 * @param records 财务预算管理记录列表
 * @returns 预算调整审批合规率百分比
 */
export function computeBudgetAdjustmentApprovalComplianceRateV13(records: BudgetMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAdjustment, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}
