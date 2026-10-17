/**
 * 健澜科技 jlmedaios - 战略KPI V13 纯函数（M407-D，M407 收官）
 *
 * computeAnnualKpiCompletionRateV13 / computeKeyTaskCompletionRateV13 / computeLeadershipTeamAssessScoreV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 战略KPI记录 */
export interface StrategicKpiRecordV13 {
  completed: number;
  totalKpi: number;
  taskDone: number;
  taskTotal: number;
  score: number;
}

/**
 * 年度KPI完成率（纯函数）：已完成KPI数/年度KPI总数×100，保留 2 位小数。
 *
 * @param records 战略KPI记录列表
 * @returns 年度KPI完成率百分比
 */
export function computeAnnualKpiCompletionRateV13(records: StrategicKpiRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalKpi, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 重点任务完成率（纯函数）：已完成重点任务数/重点任务总数×100，保留 2 位小数。
 *
 * @param records 战略KPI记录列表
 * @returns 重点任务完成率百分比
 */
export function computeKeyTaskCompletionRateV13(records: StrategicKpiRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.taskTotal, 0);
  if (total === 0) return 0;
  const done = records.reduce((acc, r) => acc + r.taskDone, 0);
  return Math.round((done / total) * 10000) / 100;
}

/**
 * 领导班子考核得分（纯函数）：平均值，保留 2 位小数。
 *
 * @param records 战略KPI记录列表
 * @returns 领导班子考核得分（平均分）
 */
export function computeLeadershipTeamAssessScoreV13(records: StrategicKpiRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / records.length) * 100) / 100;
}
