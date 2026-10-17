/**
 * 健澜科技 jlmedaios - 门诊次均费用 V13 纯函数（M317-A）
 *
 * computeDeptAvgCostV13 / computeDoctorAvgCostV13 / flagHighAvgCostV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊就诊 */
export interface OutpatientVisitV13 {
  visitId: string;
  dept: string;
  doctorId: string;
  cost: number;
}

/**
 * 科室次均费用（纯函数）：总费用/就诊人次。
 *
 * @param visits 就诊列表
 * @param dept 科室
 * @returns 次均费用
 */
export function computeDeptAvgCostV13(visits: OutpatientVisitV13[], dept: string): number {
  const deptVisits = visits.filter((v) => v.dept === dept);
  if (deptVisits.length === 0) return 0;
  const total = deptVisits.reduce((s, v) => s + v.cost, 0);
  return Math.round(total / deptVisits.length);
}

/**
 * 医生次均费用（纯函数）：总费用/就诊人次。
 *
 * @param visits 就诊列表
 * @param doctorId 医生 ID
 * @returns 次均费用
 */
export function computeDoctorAvgCostV13(visits: OutpatientVisitV13[], doctorId: string): number {
  const docVisits = visits.filter((v) => v.doctorId === doctorId);
  if (docVisits.length === 0) return 0;
  const total = docVisits.reduce((s, v) => s + v.cost, 0);
  return Math.round(total / docVisits.length);
}

/**
 * 超阈值红牌（纯函数）：avgCost > threshold → 红牌。
 *
 * @param avgCost 次均费用
 * @param threshold 阈值
 * @returns 是否红牌
 */
export function flagHighAvgCostV13(avgCost: number, threshold: number): boolean {
  return avgCost > threshold;
}
