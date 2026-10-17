/**
 * 健澜科技 jlmedaios - 平均住院日 V13 纯函数（M334-D）
 *
 * computeOverallALOSV13 / computeDeptALOSV13 / computeALOSVarianceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 平均住院日记录 */
export interface ALOSRecordV13 {
  department: string;
  inpatientDays: number;
  caseCount: number;
}

/** 科室均日项 */
export interface DeptALOSV13 {
  department: string;
  alos: number;
}

/**
 * 全院平均住院日（纯函数）：总住院天数/总病例数，保留 1 位小数。
 *
 * @param records 平均住院日记录列表
 * @returns 全院平均住院日
 */
export function computeOverallALOSV13(records: ALOSRecordV13[]): number {
  const totalDays = records.reduce((acc, r) => acc + r.inpatientDays, 0);
  const totalCases = records.reduce((acc, r) => acc + r.caseCount, 0);
  if (totalCases === 0) return 0;
  return Math.round((totalDays / totalCases) * 10) / 10;
}

/**
 * 各科室平均住院日（纯函数）：按科室分组求均值，保留 1 位小数。
 *
 * @param records 平均住院日记录列表
 * @returns 各科室均日
 */
export function computeDeptALOSV13(records: ALOSRecordV13[]): DeptALOSV13[] {
  return records.map((r) => ({
    department: r.department,
    alos: r.caseCount === 0 ? 0 : Math.round((r.inpatientDays / r.caseCount) * 10) / 10,
  }));
}

/**
 * 与基准差值（纯函数）：全院均日 - 基准均日，保留 1 位小数。
 *
 * @param overall 全院均日
 * @param benchmark 基准均日
 * @returns 差值
 */
export function computeALOSVarianceV13(overall: number, benchmark: number): number {
  return Math.round((overall - benchmark) * 10) / 10;
}
