/**
 * 健澜科技 jlmedaios - 检验报告周转时间 V13 纯函数（M338-A）
 *
 * computeOutpatientTATV13 / computeEmergencyTATV13 / computeInpatientTATV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验报告周转时间记录 */
export interface LabTurnaroundRecordV13 {
  outpatientTATHours: number;
  emergencyTATHours: number;
  inpatientTATHours: number;
}

/**
 * 门诊常规 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 检验报告周转时间记录列表
 * @returns 门诊常规 TAT（小时）
 */
export function computeOutpatientTATV13(records: LabTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.outpatientTATHours, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 急诊 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 检验报告周转时间记录列表
 * @returns 急诊 TAT（小时）
 */
export function computeEmergencyTATV13(records: LabTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.emergencyTATHours, 0);
  return Math.round((total / records.length) * 10) / 10;
}

/**
 * 住院 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 检验报告周转时间记录列表
 * @returns 住院 TAT（小时）
 */
export function computeInpatientTATV13(records: LabTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.inpatientTATHours, 0);
  return Math.round((total / records.length) * 10) / 10;
}
