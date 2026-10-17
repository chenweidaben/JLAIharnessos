/**
 * 健澜科技 jlmedaios - 病历完整性 V13 纯函数（M347-D，M347 收官）
 *
 * computeGradeARateV13 / computeGradeCRateV13 / compute72hFilingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历完整性记录 */
export interface MedicalRecordIntegrityRecordV13 {
  gradeACount: number;
  gradeCCount: number;
  sampledCount: number;
  filed72hCount: number;
  shouldFileCount: number;
}

/**
 * 甲级病历率（纯函数）：甲级数/抽查数×100，保留 2 位小数。
 *
 * @param records 病历完整性记录列表
 * @returns 甲级病历率百分比
 */
export function computeGradeARateV13(records: MedicalRecordIntegrityRecordV13[]): number {
  const gradeA = records.reduce((acc, r) => acc + r.gradeACount, 0);
  const sampled = records.reduce((acc, r) => acc + r.sampledCount, 0);
  if (sampled === 0) return 0;
  return Math.round((gradeA / sampled) * 10000) / 100;
}

/**
 * 丙级病历率（纯函数）：丙级数/抽查数×100，保留 2 位小数。
 *
 * @param records 病历完整性记录列表
 * @returns 丙级病历率百分比
 */
export function computeGradeCRateV13(records: MedicalRecordIntegrityRecordV13[]): number {
  const gradeC = records.reduce((acc, r) => acc + r.gradeCCount, 0);
  const sampled = records.reduce((acc, r) => acc + r.sampledCount, 0);
  if (sampled === 0) return 0;
  return Math.round((gradeC / sampled) * 10000) / 100;
}

/**
 * 72h 归档率（纯函数）：72h 内归档数/应归档数×100，保留 2 位小数。
 *
 * @param records 病历完整性记录列表
 * @returns 72h 归档率百分比
 */
export function compute72hFilingRateV13(records: MedicalRecordIntegrityRecordV13[]): number {
  const filed = records.reduce((acc, r) => acc + r.filed72hCount, 0);
  const should = records.reduce((acc, r) => acc + r.shouldFileCount, 0);
  if (should === 0) return 0;
  return Math.round((filed / should) * 10000) / 100;
}
