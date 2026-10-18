/**
 * 健澜科技 jlmedaios - 压疮风险管理 V13 纯函数（M439-C，患者安全与医疗风险管理组）
 *
 * computePressureUlcerHospitalRateV13 / computePressureUlcerHighRiskAssessmentRateV13 / computePressureUlcerHealingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 压疮风险管理记录 */
export interface PressureUlcerRecordV13 {
  hospitalNewPressureUlcer: number;
  totalBedDays: number;
  assessedHighRisk: number;
  shouldAssess: number;
  healedPressureUlcer: number;
  totalPressureUlcer: number;
}

/**
 * 院内压疮发生率（纯函数，千分率‰，反向指标，越低越好）：院内新发压疮例数/住院总床日数×1000，保留 2 位小数。
 *
 * @param records 压疮风险管理记录列表
 * @returns 院内压疮发生率（‰）
 */
export function computePressureUlcerHospitalRateV13(records: PressureUlcerRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBedDays, 0);
  if (total === 0) return 0;
  const hospitalNew = records.reduce((acc, r) => acc + r.hospitalNewPressureUlcer, 0);
  return Math.round((hospitalNew / total) * 100000) / 100;
}

/**
 * 高危评估率（纯函数）：已评估高危患者数/应评估高危患者总数×100，保留 2 位小数。
 *
 * @param records 压疮风险管理记录列表
 * @returns 高危评估率百分比
 */
export function computePressureUlcerHighRiskAssessmentRateV13(records: PressureUlcerRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssess, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessedHighRisk, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 压疮愈合率（纯函数）：已愈合压疮例数/压疮总例数×100，保留 2 位小数。
 *
 * @param records 压疮风险管理记录列表
 * @returns 压疮愈合率百分比
 */
export function computePressureUlcerHealingRateV13(records: PressureUlcerRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPressureUlcer, 0);
  if (total === 0) return 0;
  const healed = records.reduce((acc, r) => acc + r.healedPressureUlcer, 0);
  return Math.round((healed / total) * 10000) / 100;
}
