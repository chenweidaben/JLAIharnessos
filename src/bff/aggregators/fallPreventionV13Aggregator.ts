/**
 * 健澜科技 jlmedaios - 跌倒预防 V13 纯函数（M394-A，新规格）
 *
 * computeFallIncidenceRateV13 / computeFallRiskAssessmentRateV13 / computeFallInjuryGradeCompositionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跌倒预防记录 */
export interface FallPreventionRecordV13 {
  fallCount: number;
  bedDayCount: number;
  assessedCount: number;
  shouldCount: number;
  noneCount: number;
  minorCount: number;
  majorCount: number;
  deathCount: number;
}

/** 跌倒伤害分级构成输出 */
export interface FallInjuryGradeCompositionV13 {
  none: number;
  minor: number;
  major: number;
  death: number;
}

/**
 * 跌倒发生率（纯函数）：跌倒例数/住院床日数×1000，保留 2 位小数，千分率。
 *
 * @param records 跌倒预防记录列表
 * @returns 跌倒发生率（‰）
 */
export function computeFallIncidenceRateV13(records: FallPreventionRecordV13[]): number {
  const bedDays = records.reduce((acc, r) => acc + r.bedDayCount, 0);
  if (bedDays === 0) return 0;
  const falls = records.reduce((acc, r) => acc + r.fallCount, 0);
  return Math.round((falls / bedDays) * 100000) / 100;
}

/**
 * 跌倒风险评估率（纯函数）：已评估数/应评估数×100，保留 2 位小数。
 *
 * @param records 跌倒预防记录列表
 * @returns 跌倒风险评估率百分比
 */
export function computeFallRiskAssessmentRateV13(records: FallPreventionRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessedCount, 0);
  return Math.round((assessed / should) * 10000) / 100;
}

/**
 * 跌倒伤害分级构成（纯函数）：聚合各级别伤害例数。
 *
 * @param records 跌倒预防记录列表
 * @returns 跌倒伤害分级构成 {none, minor, major, death}
 */
export function computeFallInjuryGradeCompositionV13(records: FallPreventionRecordV13[]): FallInjuryGradeCompositionV13 {
  return {
    none: records.reduce((acc, r) => acc + r.noneCount, 0),
    minor: records.reduce((acc, r) => acc + r.minorCount, 0),
    major: records.reduce((acc, r) => acc + r.majorCount, 0),
    death: records.reduce((acc, r) => acc + r.deathCount, 0),
  };
}
