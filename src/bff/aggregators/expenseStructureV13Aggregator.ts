/**
 * 健澜科技 jlmedaios - 收入结构（支出端） V13 纯函数（M356-D，M356 收官，expense 避让已有 revenueStructureV13 / revenueStructureStatsV13）
 *
 * computeMedicalServiceRevenueRatioV13 / computePersonnelExpenseRatioV13 / computePropertyMaterialCostRatioV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 收入结构（支出端）记录 */
export interface ExpenseStructureRecordV13 {
  medicalServiceRevenue: number;
  totalRevenue: number;
  personnelExpense: number;
  totalExpense: number;
  propertyMaterialCost: number;
}

/**
 * 医疗服务收入占比（纯函数）：医疗服务收入/总收入×100，保留 2 位小数。
 *
 * @param records 收入结构（支出端）记录列表
 * @returns 医疗服务收入占比百分比
 */
export function computeMedicalServiceRevenueRatioV13(records: ExpenseStructureRecordV13[]): number {
  const ms = records.reduce((acc, r) => acc + r.medicalServiceRevenue, 0);
  const total = records.reduce((acc, r) => acc + r.totalRevenue, 0);
  if (total === 0) return 0;
  return Math.round((ms / total) * 10000) / 100;
}

/**
 * 人员支出占比（纯函数）：人员支出/总支出×100，保留 2 位小数。
 *
 * @param records 收入结构（支出端）记录列表
 * @returns 人员支出占比百分比
 */
export function computePersonnelExpenseRatioV13(records: ExpenseStructureRecordV13[]): number {
  const personnel = records.reduce((acc, r) => acc + r.personnelExpense, 0);
  const total = records.reduce((acc, r) => acc + r.totalExpense, 0);
  if (total === 0) return 0;
  return Math.round((personnel / total) * 10000) / 100;
}

/**
 * 财产物资消耗占比（纯函数）：财产物资消耗/总支出×100，保留 2 位小数。
 *
 * @param records 收入结构（支出端）记录列表
 * @returns 财产物资消耗占比百分比
 */
export function computePropertyMaterialCostRatioV13(records: ExpenseStructureRecordV13[]): number {
  const material = records.reduce((acc, r) => acc + r.propertyMaterialCost, 0);
  const total = records.reduce((acc, r) => acc + r.totalExpense, 0);
  if (total === 0) return 0;
  return Math.round((material / total) * 10000) / 100;
}
