/**
 * 健澜科技 jlmedaios - 院感监测看板纯函数（M76-A）
 * 手卫生依从率 / 器械相关感染千日率 / SSI 率 / 科室排名 / 超阈值告警。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 手卫生依从率（百分比，0-100）。 */
export function handHygieneRate(observations: number, compliant: number): number {
  if (observations <= 0) return 0;
  return Math.round((compliant / observations) * 1000) / 10;
}

/** 器械相关感染率（每千个器械日）。 */
export function deviceRate(cases: number, deviceDays: number): number {
  if (deviceDays <= 0) return 0;
  return Math.round((cases / deviceDays) * 10000) / 10;
}

/** 手术部位感染率（百分比）。 */
export function ssiRate(ssiCases: number, operationCount: number): number {
  if (operationCount <= 0) return 0;
  return Math.round((ssiCases / operationCount) * 1000) / 10;
}

export interface DeptMetric {
  department: string;
  infectionRate: number;
}

/** 科室按感染率降序。 */
export function departmentRanking(metrics: DeptMetric[]): DeptMetric[] {
  return [...metrics].sort((a, b) => b.infectionRate - a.infectionRate);
}

/** 超阈值告警。 */
export function isAlert(rate: number, threshold: number): boolean {
  return rate > threshold;
}
