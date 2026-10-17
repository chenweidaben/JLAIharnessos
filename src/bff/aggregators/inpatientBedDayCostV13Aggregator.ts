/**
 * 健澜科技 jlmedaios - 住院床日成本 V13 纯函数（M317-B）
 *
 * computeDeptBedDayCostV13 / computeCostCompositionV13 / flagAbnormalBedDayCostV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 住院就诊 */
export interface InpatientAdmitV13 {
  admitId: string;
  dept: string;
  bedDays: number;
  materialCost: number;
  drugCost: number;
  examCost: number;
  otherCost: number;
}

/** 成本占比 */
export interface CostCompositionV13 {
  material: number;
  drug: number;
  exam: number;
  other: number;
}

/**
 * 科室床日成本（纯函数）：总费用/床日数。
 *
 * @param admits 住院列表
 * @param dept 科室
 * @returns 床日成本
 */
export function computeDeptBedDayCostV13(admits: InpatientAdmitV13[], dept: string): number {
  const deptAdmits = admits.filter((a) => a.dept === dept);
  const totalBedDays = deptAdmits.reduce((s, a) => s + a.bedDays, 0);
  if (totalBedDays === 0) return 0;
  const totalCost = deptAdmits.reduce(
    (s, a) => s + a.materialCost + a.drugCost + a.examCost + a.otherCost,
    0,
  );
  return Math.round(totalCost / totalBedDays);
}

/**
 * 成本占比（纯函数）：耗材/药品/检查/其他 各占总成本百分比。
 *
 * @param admits 住院列表
 * @returns 成本占比
 */
export function computeCostCompositionV13(admits: InpatientAdmitV13[]): CostCompositionV13 {
  let material = 0;
  let drug = 0;
  let exam = 0;
  let other = 0;
  for (const a of admits) {
    material += a.materialCost;
    drug += a.drugCost;
    exam += a.examCost;
    other += a.otherCost;
  }
  const total = material + drug + exam + other;
  if (total === 0) return { material: 0, drug: 0, exam: 0, other: 0 };
  return {
    material: Math.round((material / total) * 100),
    drug: Math.round((drug / total) * 100),
    exam: Math.round((exam / total) * 100),
    other: Math.round((other / total) * 100),
  };
}

/**
 * 异常科室标红（纯函数）：avgCost > threshold → 红牌。
 *
 * @param avgCost 床日成本
 * @param threshold 阈值
 * @returns 是否红牌
 */
export function flagAbnormalBedDayCostV13(avgCost: number, threshold: number): boolean {
  return avgCost > threshold;
}
