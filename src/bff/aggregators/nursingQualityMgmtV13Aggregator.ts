/**
 * 健澜科技 jlmedaios - 护理质量管理 V13 纯函数（M453-A，护理管理组）
 *
 * computeNursingQualityControlQualifiedRateV13 / computeNursingMeasureImplementationRateV13 / computeNursingDocumentWritingQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理质量管理记录 */
export interface NursingQualityMgmtRecordV13 {
  qualified: number;
  totalCheck: number;
  implemented: number;
  totalMeasure: number;
  qualifiedDoc: number;
  totalDocument: number;
}

/**
 * 护理质控合格率（纯函数）：质控合格项数/质控检查项总数×100，保留 2 位小数。
 *
 * @param records 护理质量管理记录列表
 * @returns 护理质控合格率百分比
 */
export function computeNursingQualityControlQualifiedRateV13(records: NursingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCheck, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 护理措施落实率（纯函数）：落实护理措施数/护理措施总数×100，保留 2 位小数。
 *
 * @param records 护理质量管理记录列表
 * @returns 护理措施落实率百分比
 */
export function computeNursingMeasureImplementationRateV13(records: NursingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalMeasure, 0);
  if (total === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.implemented, 0);
  return Math.round((implemented / total) * 10000) / 100;
}

/**
 * 护理文书书写合格率（纯函数）：合格护理文书数/护理文书总数×100，保留 2 位小数。
 *
 * @param records 护理质量管理记录列表
 * @returns 护理文书书写合格率百分比
 */
export function computeNursingDocumentWritingQualifiedRateV13(records: NursingQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDocument, 0);
  if (total === 0) return 0;
  const qualifiedDoc = records.reduce((acc, r) => acc + r.qualifiedDoc, 0);
  return Math.round((qualifiedDoc / total) * 10000) / 100;
}
