/**
 * 健澜科技 jlmedaios - 医疗废物质量管理 V13 纯函数（M441-D，M441 收官，医院感染管理组）
 *
 * computeMedicalWasteClassificationAccuracyRateV13 / computeMedicalWasteHandoverComplianceRateV13 / computeMedicalWasteStorageComplianceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗废物质量管理记录 */
export interface MedicalWasteMgmtQualityRecordV13 {
  classificationAccurate: number;
  classificationTotal: number;
  handoverCompliant: number;
  handoverTotal: number;
  storageCompliant: number;
  storageTotal: number;
}

/**
 * 医废分类准确率（纯函数）：分类准确医废次数/医废分类总次数×100，保留 2 位小数。
 *
 * @param records 医疗废物质量管理记录列表
 * @returns 医废分类准确率百分比
 */
export function computeMedicalWasteClassificationAccuracyRateV13(records: MedicalWasteMgmtQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.classificationTotal, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.classificationAccurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 医废交接规范率（纯函数）：规范交接医废次数/医废交接总次数×100，保留 2 位小数。
 *
 * @param records 医疗废物质量管理记录列表
 * @returns 医废交接规范率百分比
 */
export function computeMedicalWasteHandoverComplianceRateV13(records: MedicalWasteMgmtQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverTotal, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.handoverCompliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}

/**
 * 医废暂存达标率（纯函数）：暂存达标次数/医废暂存总次数×100，保留 2 位小数。
 *
 * @param records 医疗废物质量管理记录列表
 * @returns 医废暂存达标率百分比
 */
export function computeMedicalWasteStorageComplianceRateV13(records: MedicalWasteMgmtQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.storageTotal, 0);
  if (total === 0) return 0;
  const compliant = records.reduce((acc, r) => acc + r.storageCompliant, 0);
  return Math.round((compliant / total) * 10000) / 100;
}
