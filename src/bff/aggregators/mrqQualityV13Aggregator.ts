/**
 * 健澜科技 jlmedaios - 病案质量 V13 纯函数（M334-A）
 *
 * computeGradeARateV13 / computeGradeCRateV13 / computeDefectRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病案质量记录 */
export interface MRQRecordV13 {
  totalRecords: number;
  gradeACount: number;
  gradeCCount: number;
  defectCount: number;
}

/**
 * 甲级病案率（纯函数）：甲级数/总数×100。
 *
 * @param records 病案质量记录列表
 * @returns 甲级率百分比
 */
export function computeGradeARateV13(records: MRQRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  const gradeA = records.reduce((acc, r) => acc + r.gradeACount, 0);
  if (total === 0) return 0;
  return Math.round((gradeA / total) * 100);
}

/**
 * 丙级病案率（纯函数）：丙级数/总数×100。
 *
 * @param records 病案质量记录列表
 * @returns 丙级率百分比
 */
export function computeGradeCRateV13(records: MRQRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  const gradeC = records.reduce((acc, r) => acc + r.gradeCCount, 0);
  if (total === 0) return 0;
  return Math.round((gradeC / total) * 100);
}

/**
 * 36 项缺陷率（纯函数）：缺陷病案数/总数×100。
 *
 * @param records 病案质量记录列表
 * @returns 缺陷率百分比
 */
export function computeDefectRateV13(records: MRQRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  const defect = records.reduce((acc, r) => acc + r.defectCount, 0);
  if (total === 0) return 0;
  return Math.round((defect / total) * 100);
}
