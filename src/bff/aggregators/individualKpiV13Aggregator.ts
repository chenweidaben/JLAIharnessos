/**
 * 健澜科技 jlmedaios - 个人KPI V13 纯函数（M410-B）
 *
 * computeIndividualKpiCompletionRateV13 / computeIndividualPerformanceScoreV13 / computeIndividualExcellentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 个人KPI记录 */
export interface IndividualKpiRecordV13 {
  completed: number;
  total: number;
  score: number;
  excellent: number;
  assessed: number;
}

/**
 * 个人KPI完成率（纯函数）：已完成KPI数/个人KPI总数×100，保留 2 位小数。
 *
 * @param records 个人KPI记录列表
 * @returns 个人KPI完成率百分比
 */
export function computeIndividualKpiCompletionRateV13(records: IndividualKpiRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.total, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 个人绩效得分（纯函数）：平均值，保留 2 位小数。
 *
 * @param records 个人KPI记录列表
 * @returns 个人绩效得分（平均分）
 */
export function computeIndividualPerformanceScoreV13(records: IndividualKpiRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / records.length) * 100) / 100;
}

/**
 * 个人评优率（纯函数）：评优人数/考核总人数×100，保留 2 位小数。
 *
 * @param records 个人KPI记录列表
 * @returns 个人评优率百分比
 */
export function computeIndividualExcellentRateV13(records: IndividualKpiRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.assessed, 0);
  if (total === 0) return 0;
  const excellent = records.reduce((acc, r) => acc + r.excellent, 0);
  return Math.round((excellent / total) * 10000) / 100;
}
