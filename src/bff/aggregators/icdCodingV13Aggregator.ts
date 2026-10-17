/**
 * 健澜科技 jlmedaios - ICD 编码准确率 V13 纯函数（M334-B）
 *
 * computePrimaryDxAccuracyV13 / computeProcedureAccuracyV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICD 编码记录 */
export interface ICDCodingRecordV13 {
  totalRecords: number;
  primaryDxAccurateCount: number;
  procedureAccurateCount: number;
}

/**
 * 主诊断编码准确率（纯函数）：准确数/总数×100。
 *
 * @param records ICD 编码记录列表
 * @returns 主诊断准确率百分比
 */
export function computePrimaryDxAccuracyV13(records: ICDCodingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  const accurate = records.reduce((acc, r) => acc + r.primaryDxAccurateCount, 0);
  if (total === 0) return 0;
  return Math.round((accurate / total) * 100);
}

/**
 * 手术编码准确率（纯函数）：准确数/总数×100。
 *
 * @param records ICD 编码记录列表
 * @returns 手术准确率百分比
 */
export function computeProcedureAccuracyV13(records: ICDCodingRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecords, 0);
  const accurate = records.reduce((acc, r) => acc + r.procedureAccurateCount, 0);
  if (total === 0) return 0;
  return Math.round((accurate / total) * 100);
}
