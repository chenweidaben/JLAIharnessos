/**
 * 健澜科技 jlmedaios - 预算执行质量管理 V13 纯函数（M435-A，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
 *
 * computeBudgetExecutionRateV13 / computeBudgetDeviationRateV13 / computeCostControlRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预算执行质量管理记录 */
export interface BudgetExecutionQualityMgmtRecordV13 {
  executedBudget: number;
  totalBudget: number;
  actualSpent: number;
  budgetAmount: number;
  controlledCost: number;
  budgetCost: number;
}

/**
 * 预算执行率（纯函数）：已执行预算金额/预算总金额×100，保留 2 位小数。
 *
 * @param records 预算执行质量管理记录列表
 * @returns 预算执行率百分比
 */
export function computeBudgetExecutionRateV13(records: BudgetExecutionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBudget, 0);
  if (total === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executedBudget, 0);
  return Math.round((executed / total) * 10000) / 100;
}

/**
 * 预算偏差率（纯函数，反向指标，越低越好）：|实际支出-预算金额|/预算金额×100，保留 2 位小数。
 *
 * @param records 预算执行质量管理记录列表
 * @returns 预算偏差率百分比
 */
export function computeBudgetDeviationRateV13(records: BudgetExecutionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetAmount, 0);
  if (total === 0) return 0;
  const deviation = records.reduce((acc, r) => acc + Math.abs(r.actualSpent - r.budgetAmount), 0);
  return Math.round((deviation / total) * 10000) / 100;
}

/**
 * 成本控制率（纯函数，反向指标，越低越好）：控制后成本/预算成本×100，保留 2 位小数。
 *
 * @param records 预算执行质量管理记录列表
 * @returns 成本控制率百分比
 */
export function computeCostControlRateV13(records: BudgetExecutionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetCost, 0);
  if (total === 0) return 0;
  const controlled = records.reduce((acc, r) => acc + r.controlledCost, 0);
  return Math.round((controlled / total) * 10000) / 100;
}
