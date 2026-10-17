/**
 * 健澜科技 jlmedaios - 科室KPI V13 纯函数（M410-A）
 *
 * computeDepartmentKpiCompletionRateV13 / computeDepartmentPerformanceScoreV13 / computeDepartmentRankingV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室KPI记录 */
export interface DepartmentKpiRecordV13 {
  completed: number;
  total: number;
  score: number;
  ranking: number;
}

/**
 * 科室KPI完成率（纯函数）：已完成KPI数/科室KPI总数×100，保留 2 位小数。
 *
 * @param records 科室KPI记录列表
 * @returns 科室KPI完成率百分比
 */
export function computeDepartmentKpiCompletionRateV13(records: DepartmentKpiRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 科室绩效得分（纯函数）：平均值，保留 2 位小数。
 *
 * @param records 科室KPI记录列表
 * @returns 科室绩效得分（平均分）
 */
export function computeDepartmentPerformanceScoreV13(records: DepartmentKpiRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 科室排名（纯函数）：取最佳排名（Math.min，越小越好）。
 *
 * @param records 科室KPI记录列表
 * @returns 最佳排名
 */
export function computeDepartmentRankingV13(records: DepartmentKpiRecordV13[]): number {
  if (records.length === 0) return 0;
  return Math.min(...records.map((r) => r.ranking));
}
