/**
 * 健澜科技 jlmedaios - 人员流失率 V13 纯函数（M317-D）
 *
 * computeMonthlyTurnoverRateV13 / groupTurnoverByDeptV13 / identifyHighTurnoverDeptsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 流失记录 */
export interface TurnoverRecordV13 {
  dept: string;
  headcountAtMonthStart: number;
  resignationCount: number;
}

/** 科室流失率 */
export interface DeptTurnoverV13 {
  dept: string;
  rate: number;
}

/**
 * 月度离职率（纯函数）：本月离职数/月初在职数×100。
 *
 * @param records 流失记录列表
 * @returns 月度离职率百分比
 */
export function computeMonthlyTurnoverRateV13(records: TurnoverRecordV13[]): number {
  const totalHeadcount = records.reduce((s, r) => s + r.headcountAtMonthStart, 0);
  if (totalHeadcount === 0) return 0;
  const totalResignation = records.reduce((s, r) => s + r.resignationCount, 0);
  return Math.round((totalResignation / totalHeadcount) * 100);
}

/**
 * 按科室分组流失率（纯函数）。
 *
 * @param records 流失记录列表
 * @returns 各科室流失率
 */
export function groupTurnoverByDeptV13(records: TurnoverRecordV13[]): DeptTurnoverV13[] {
  return records.map((r) => ({
    dept: r.dept,
    rate: r.headcountAtMonthStart === 0 ? 0 : Math.round((r.resignationCount / r.headcountAtMonthStart) * 1000) / 10,
  }));
}

/**
 * 高流失科室预警（纯函数）：流失率 > 阈值 → 预警。
 *
 * @param deptRates 科室流失率
 * @param threshold 阈值（百分比）
 * @returns 高流失科室列表
 */
export function identifyHighTurnoverDeptsV13(deptRates: DeptTurnoverV13[], threshold: number): DeptTurnoverV13[] {
  return deptRates.filter((d) => d.rate > threshold);
}
