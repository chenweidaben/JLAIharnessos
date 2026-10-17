/**
 * 健澜科技 jlmedaios - 手卫生依从性 V13 纯函数（M318-C）
 *
 * computeHygieneComplianceRateV13 / groupByDeptV13 / flagLowComplianceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手卫生观察 */
export interface HygieneObservationV13 {
  observationId: string;
  dept: string;
  isCompliant: boolean;
}

/** 科室依从率 */
export interface DeptComplianceV13 {
  dept: string;
  rate: number;
}

/**
 * 整体依从率（纯函数）：合格次数/观察次数×100。
 *
 * @param observations 观察列表
 * @returns 依从率百分比
 */
export function computeHygieneComplianceRateV13(observations: HygieneObservationV13[]): number {
  if (observations.length === 0) return 0;
  const compliant = observations.filter((o) => o.isCompliant).length;
  return Math.round((compliant / observations.length) * 100);
}

/**
 * 按科室分组依从率（纯函数）。
 *
 * @param observations 观察列表
 * @returns 各科室依从率
 */
export function groupByDeptV13(observations: HygieneObservationV13[]): DeptComplianceV13[] {
  const depts = [...new Set(observations.map((o) => o.dept))];
  return depts.map((dept) => {
    const deptObs = observations.filter((o) => o.dept === dept);
    const compliant = deptObs.filter((o) => o.isCompliant).length;
    return {
      dept,
      rate: deptObs.length === 0 ? 0 : Math.round((compliant / deptObs.length) * 100),
    };
  });
}

/**
 * 低依从红牌（纯函数）：rate < threshold → 红牌。
 *
 * @param rate 依从率
 * @param threshold 阈值
 * @returns 是否红牌
 */
export function flagLowComplianceV13(rate: number, threshold: number): boolean {
  return rate < threshold;
}
