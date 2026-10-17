/**
 * 健澜科技 jlmedaios - 绩效考核 V13 纯函数（M402-D，M402 收官）
 *
 * computeDepartmentExcellentRateV13 / computePersonalExcellentRateV13 / computePerformanceAppealHandleRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 绩效考核记录 */
export interface PerformanceEvalDetailRecordV13 {
  deptExcellent: number;
  deptTotal: number;
  personExcellent: number;
  personTotal: number;
  handledAppeal: number;
  totalAppeal: number;
}

/**
 * 科室考核优秀率（纯函数）：优秀科室数/考核科室总数×100，保留 2 位小数。
 *
 * @param records 绩效考核记录列表
 * @returns 科室考核优秀率百分比
 */
export function computeDepartmentExcellentRateV13(records: PerformanceEvalDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.deptTotal, 0);
  if (total === 0) return 0;
  const excellent = records.reduce((acc, r) => acc + r.deptExcellent, 0);
  return Math.round((excellent / total) * 10000) / 100;
}

/**
 * 个人考核优秀率（纯函数）：优秀个人数/考核个人总数×100，保留 2 位小数。
 *
 * @param records 绩效考核记录列表
 * @returns 个人考核优秀率百分比
 */
export function computePersonalExcellentRateV13(records: PerformanceEvalDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.personTotal, 0);
  if (total === 0) return 0;
  const excellent = records.reduce((acc, r) => acc + r.personExcellent, 0);
  return Math.round((excellent / total) * 10000) / 100;
}

/**
 * 绩效申诉处理率（纯函数）：已处理申诉数/申诉总数×100，保留 2 位小数。
 *
 * @param records 绩效考核记录列表
 * @returns 绩效申诉处理率百分比
 */
export function computePerformanceAppealHandleRateV13(records: PerformanceEvalDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalAppeal, 0);
  if (total === 0) return 0;
  const handled = records.reduce((acc, r) => acc + r.handledAppeal, 0);
  return Math.round((handled / total) * 10000) / 100;
}
