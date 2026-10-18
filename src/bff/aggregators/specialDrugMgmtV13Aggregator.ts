/**
 * 健澜科技 jlmedaios - 特殊药品管理 V13 纯函数（M455-D，M455 收官，药品供应与库存管理组）
 *
 * computeSpecialDrugAccountMatchRateV13 / computeSpecialDrugPrescriptionQualifiedRateV13 / computeSpecialDrugHandoverRecordCompletenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 特殊药品管理记录 */
export interface SpecialDrugMgmtRecordV13 {
  matched: number;
  totalItem: number;
  qualified: number;
  totalPrescription: number;
  complete: number;
  totalRecord: number;
}

/**
 * 麻精药品账物相符率（纯函数）：账物相符品种数/特殊药品品种总数×100，保留 2 位小数。
 *
 * @param records 特殊药品管理记录列表
 * @returns 麻精药品账物相符率百分比
 */
export function computeSpecialDrugAccountMatchRateV13(records: SpecialDrugMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalItem, 0);
  if (total === 0) return 0;
  const matched = records.reduce((acc, r) => acc + r.matched, 0);
  return Math.round((matched / total) * 10000) / 100;
}

/**
 * 特殊药品处方合格率（纯函数）：合格处方数/特殊药品处方总数×100，保留 2 位小数。
 *
 * @param records 特殊药品管理记录列表
 * @returns 特殊药品处方合格率百分比
 */
export function computeSpecialDrugPrescriptionQualifiedRateV13(records: SpecialDrugMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPrescription, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 特殊药品交接班记录完整率（纯函数）：完整交接班记录数/交接班记录总数×100，保留 2 位小数。
 *
 * @param records 特殊药品管理记录列表
 * @returns 特殊药品交接班记录完整率百分比
 */
export function computeSpecialDrugHandoverRecordCompletenessRateV13(records: SpecialDrugMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalRecord, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}
