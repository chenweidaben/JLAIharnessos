/**
 * 健澜科技 jlmedaios - 病理报告 TAT V13 纯函数（M342-B）
 *
 * computeRoutineTATV13 / computeIntraOpTATV13 / computeFrozenTATV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病理报告 TAT 记录 */
export interface PathologyTurnaroundRecordV13 {
  routineTatHours: number;
  intraOpTatHours: number;
  frozenTatHours: number;
}

/**
 * 常规病理 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 病理报告 TAT 记录列表
 * @returns 常规病理 TAT（小时）
 */
export function computeRoutineTATV13(records: PathologyTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.routineTatHours, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 术中 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 病理报告 TAT 记录列表
 * @returns 术中 TAT（小时）
 */
export function computeIntraOpTATV13(records: PathologyTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.intraOpTatHours, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

/**
 * 冰冻 TAT（纯函数）：均值，保留 1 位小数。
 *
 * @param records 病理报告 TAT 记录列表
 * @returns 冰冻 TAT（小时）
 */
export function computeFrozenTATV13(records: PathologyTurnaroundRecordV13[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.frozenTatHours, 0);
  return Math.round((sum / records.length) * 10) / 10;
}
