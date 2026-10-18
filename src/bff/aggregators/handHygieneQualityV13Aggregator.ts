/**
 * 健澜科技 jlmedaios - 手卫生质量管理 V13 纯函数（M441-B，医院感染管理组）
 *
 * computeHandHygieneComplianceRateV13 / computeHandHygieneQualifiedRateV13 / computeHandHygieneFacilityIntegrityRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 手卫生质量管理记录 */
export interface HandHygieneQualityRecordV13 {
  actualPerformed: number;
  shouldPerform: number;
  qualifiedHandHygiene: number;
  sampledHandHygiene: number;
  intactFacility: number;
  totalFacility: number;
}

/**
 * 手卫生依从率（纯函数）：实际执行手卫生次数/应执行手卫生总次数×100，保留 2 位小数。
 *
 * @param records 手卫生质量管理记录列表
 * @returns 手卫生依从率百分比
 */
export function computeHandHygieneComplianceRateV13(records: HandHygieneQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldPerform, 0);
  if (total === 0) return 0;
  const performed = records.reduce((acc, r) => acc + r.actualPerformed, 0);
  return Math.round((performed / total) * 10000) / 100;
}

/**
 * 手卫生合格率（纯函数）：合格手卫生次数/抽查手卫生总次数×100，保留 2 位小数。
 *
 * @param records 手卫生质量管理记录列表
 * @returns 手卫生合格率百分比
 */
export function computeHandHygieneQualifiedRateV13(records: HandHygieneQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.sampledHandHygiene, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedHandHygiene, 0);
  return Math.round((qualified / total) * 10000) / 100;
}

/**
 * 手卫生设施完好率（纯函数）：完好手卫生设施数/手卫生设施总数×100，保留 2 位小数。
 *
 * @param records 手卫生质量管理记录列表
 * @returns 手卫生设施完好率百分比
 */
export function computeHandHygieneFacilityIntegrityRateV13(records: HandHygieneQualityRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFacility, 0);
  if (total === 0) return 0;
  const intact = records.reduce((acc, r) => acc + r.intactFacility, 0);
  return Math.round((intact / total) * 10000) / 100;
}
