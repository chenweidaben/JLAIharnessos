/**
 * 健澜科技 jlmedaios - 合理用药统计看板纯函数（M77-A）
 * DDDs 每百人天 / 抗菌药使用率 / 特殊级占比 / 围术期预防合理率 / 排名 / 超阈值。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 每百人天 DDDs。 */
export function dddsPer100(ddds: number, inpatientDays: number): number {
  if (inpatientDays <= 0) return 0;
  return Math.round((ddds / inpatientDays) * 1000) / 10;
}

/** 抗菌药物使用率（百分比）。 */
export function antibioticRate(patients: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((patients / total) * 1000) / 10;
}

/** 特殊级抗菌药占比（百分比）。 */
export function specialClassRate(special: number, antibiotic: number): number {
  if (antibiotic <= 0) return 0;
  return Math.round((special / antibiotic) * 1000) / 10;
}

/** 围术期预防用药合理率（百分比）。 */
export function prophylaxisRate(reasonable: number, cases: number): number {
  if (cases <= 0) return 0;
  return Math.round((reasonable / cases) * 1000) / 10;
}

export interface DeptMetric {
  department: string;
  ddds: number;
}

/** 科室按 DDDs 降序。 */
export function departmentRanking(metrics: DeptMetric[]): DeptMetric[] {
  return [...metrics].sort((a, b) => b.ddds - a.ddds);
}

/** 超阈值告警。 */
export function isAlert(rate: number, threshold: number): boolean {
  return rate > threshold;
}
