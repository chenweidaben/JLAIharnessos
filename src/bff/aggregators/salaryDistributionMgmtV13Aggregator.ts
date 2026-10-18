/**
 * 健澜科技 jlmedaios - 薪酬分配管理 V13 纯函数（M444-B，绩效薪酬与人力资源管理组）
 *
 * computeSalaryDistributionTimelinessRateV13 / computeSalaryDistributionComplianceRateV13 / computeSalaryDistributionSatisfactionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 薪酬分配管理记录 */
export interface SalaryDistributionMgmtRecordV13 {
  timelyPaid: number;
  shouldPay: number;
  compliantPlan: number;
  totalPlan: number;
  satisfiedStaff: number;
  surveyedStaff: number;
}

/**
 * 绩效工资发放及时率（纯函数）：及时发放次数/应发放次数×100，保留 2 位小数。
 *
 * @param records 薪酬分配管理记录列表
 * @returns 绩效工资发放及时率百分比
 */
export function computeSalaryDistributionTimelinessRateV13(records: SalaryDistributionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldPay, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyPaid, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 分配方案合规率（纯函数）：合规分配方案数/分配方案总数×100，保留 2 位小数。
 *
 * @param records 薪酬分配管理记录列表
 * @returns 分配方案合规率百分比
 */
export function computeSalaryDistributionComplianceRateV13(records: SalaryDistributionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPlan, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.compliantPlan, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 员工薪酬满意度（纯函数）：满意员工数/调查员工总数×100，保留 2 位小数。
 *
 * @param records 薪酬分配管理记录列表
 * @returns 员工薪酬满意度百分比
 */
export function computeSalaryDistributionSatisfactionRateV13(records: SalaryDistributionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.surveyedStaff, 0);
  if (total === 0) return 0;
  const satisfied = records.reduce((acc, r) => acc + r.satisfiedStaff, 0);
  return Math.round((satisfied / total) * 10000) / 100;
}
