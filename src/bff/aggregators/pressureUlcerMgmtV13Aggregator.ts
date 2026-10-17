/**
 * 健澜科技 jlmedaios - 压疮管理 V13 纯函数（M394-B）
 *
 * computePressureUlcerIncidenceRateV13 / computePressureUlcerRiskAssessmentRateV13 / computePressureUlcerHealingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 压疮管理记录 */
export interface PressureUlcerMgmtRecordV13 {
  occurrenceCount: number;
  bedDayCount: number;
  assessedCount: number;
  shouldCount: number;
  healedCount: number;
  totalCount: number;
}

/**
 * 压疮发生率（纯函数）：发生例数/住院床日数×1000，保留 2 位小数，千分率。
 *
 * @param records 压疮管理记录列表
 * @returns 压疮发生率（‰）
 */
export function computePressureUlcerIncidenceRateV13(records: PressureUlcerMgmtRecordV13[]): number {
  const bedDays = records.reduce((acc, r) => acc + r.bedDayCount, 0);
  if (bedDays === 0) return 0;
  const occurrence = records.reduce((acc, r) => acc + r.occurrenceCount, 0);
  return Math.round((occurrence / bedDays) * 100000) / 100;
}

/**
 * 压疮风险评估率（纯函数）：已评估数/应评估数×100，保留 2 位小数。
 *
 * @param records 压疮管理记录列表
 * @returns 压疮风险评估率百分比
 */
export function computePressureUlcerRiskAssessmentRateV13(records: PressureUlcerMgmtRecordV13[]): number {
  const should = records.reduce((acc, r) => acc + r.shouldCount, 0);
  if (should === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessedCount, 0);
  return Math.round((assessed / should) * 10000) / 100;
}

/**
 * 压疮愈合率（纯函数）：已愈合例数/压疮总例数×100，保留 2 位小数。
 *
 * @param records 压疮管理记录列表
 * @returns 压疮愈合率百分比
 */
export function computePressureUlcerHealingRateV13(records: PressureUlcerMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const healed = records.reduce((acc, r) => acc + r.healedCount, 0);
  return Math.round((healed / total) * 10000) / 100;
}
