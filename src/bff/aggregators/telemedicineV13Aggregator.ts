/**
 * 健澜科技 jlmedaios - 远程会诊量 V13 纯函数（M324-C）
 *
 * countMonthlyConsultationsV13 / computeAvgResponseTimeV13 / classifyConsultByDeptV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 远程会诊记录 */
export interface TeleconsultationV13 {
  dept: string;
  responseMinutes: number;
}

/** 科室分布项 */
export interface DeptDistributionV13 {
  dept: string;
  count: number;
}

/**
 * 本月远程会诊次数（纯函数）：总数。
 *
 * @param consults 会诊记录列表
 * @returns 会诊次数
 */
export function countMonthlyConsultationsV13(consults: TeleconsultationV13[]): number {
  return consults.length;
}

/**
 * 平均响应时长（纯函数）：均值，分钟。
 *
 * @param consults 会诊记录列表
 * @returns 平均响应时长（保留 1 位小数）
 */
export function computeAvgResponseTimeV13(consults: TeleconsultationV13[]): number {
  if (consults.length === 0) return 0;
  const sum = consults.reduce((acc, c) => acc + c.responseMinutes, 0);
  return Math.round((sum / consults.length) * 10) / 10;
}

/**
 * 会诊科室分布（纯函数）：按科室分组计数。
 *
 * @param consults 会诊记录列表
 * @returns 科室分布列表
 */
export function classifyConsultByDeptV13(consults: TeleconsultationV13[]): DeptDistributionV13[] {
  const map = new Map<string, number>();
  for (const c of consults) {
    map.set(c.dept, (map.get(c.dept) ?? 0) + 1);
  }
  return [...map.entries()].map(([dept, count]) => ({ dept, count }));
}
