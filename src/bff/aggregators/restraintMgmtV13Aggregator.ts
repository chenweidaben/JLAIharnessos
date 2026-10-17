/**
 * 健澜科技 jlmedaios - 身体约束管理 V13 纯函数（M422-D，M422 收官）
 *
 * computePhysicalRestraintUsageRateV13 / computeRestraintComplicationRateV13 / computeRestraintInformedConsentRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 身体约束管理记录 */
export interface RestraintMgmtRecordV13 {
  restraintUsed: number;
  inpatientTotal: number;
  complicationOccurred: number;
  informedConsentSigned: number;
}

/**
 * 身体约束使用率（纯函数，反向指标，值越低越好）：使用约束患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 身体约束管理记录列表
 * @returns 身体约束使用率百分比
 */
export function computePhysicalRestraintUsageRateV13(records: RestraintMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const restraintUsed = records.reduce((acc, r) => acc + r.restraintUsed, 0);
  return Math.round((restraintUsed / total) * 10000) / 100;
}

/**
 * 约束并发症率（纯函数，反向指标，值越低越好）：发生并发症患者数/使用约束患者数×100，保留 2 位小数。
 *
 * @param records 身体约束管理记录列表
 * @returns 约束并发症率百分比
 */
export function computeRestraintComplicationRateV13(records: RestraintMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.restraintUsed, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complicationOccurred, 0);
  return Math.round((complication / total) * 10000) / 100;
}

/**
 * 约束知情同意率（纯函数）：签署知情同意数/使用约束患者数×100，保留 2 位小数。
 *
 * @param records 身体约束管理记录列表
 * @returns 约束知情同意率百分比
 */
export function computeRestraintInformedConsentRateV13(records: RestraintMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.restraintUsed, 0);
  if (total === 0) return 0;
  const signed = records.reduce((acc, r) => acc + r.informedConsentSigned, 0);
  return Math.round((signed / total) * 10000) / 100;
}
