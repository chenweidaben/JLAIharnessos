/**
 * 健澜科技 jlmedaios - 护理质量 V13 纯函数（M389-A）
 *
 * computeBasicNursingQualificationRateV13 / computeSpecialNursingQualificationRateV13 / computeNursingMeasureImplementationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护理质量记录 */
export interface NursingCareQualityRecordV13 {
  basicQualifiedCount: number;
  basicInspectCount: number;
  specialQualifiedCount: number;
  specialInspectCount: number;
  implementedCount: number;
  shouldImplementCount: number;
}

/**
 * 基础护理合格率（纯函数）：合格项数/检查项数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 基础护理合格率百分比
 */
export function computeBasicNursingQualificationRateV13(records: NursingCareQualityRecordV13[]): number {
  const inspect = records.reduce((acc, r) => acc + r.basicInspectCount, 0);
  if (inspect === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.basicQualifiedCount, 0);
  return Math.round((qualified / inspect) * 10000) / 100;
}

/**
 * 特级护理合格率（纯函数）：合格项数/检查项数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 特级护理合格率百分比
 */
export function computeSpecialNursingQualificationRateV13(records: NursingCareQualityRecordV13[]): number {
  const inspect = records.reduce((acc, r) => acc + r.specialInspectCount, 0);
  if (inspect === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.specialQualifiedCount, 0);
  return Math.round((qualified / inspect) * 10000) / 100;
}

/**
 * 护理措施落实率（纯函数）：已落实数/应落实数×100，保留 2 位小数。
 *
 * @param records 护理质量记录列表
 * @returns 护理措施落实率百分比
 */
export function computeNursingMeasureImplementationRateV13(records: NursingCareQualityRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldImplementCount, 0);
  if (should === 0) return 0;
  const implemented = records.reduce((acc, r) => acc + r.implementedCount, 0);
  return Math.round((implemented / should) * 10000) / 100;
}
