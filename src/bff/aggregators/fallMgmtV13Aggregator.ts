/**
 * 健澜科技 jlmedaios - 跌倒管理 V13 纯函数（M422-C）
 *
 * computeFallRiskAssessmentRateV13 / computeFallOccurrenceRateV13 / computeFallInjuryGradeRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跌倒管理记录 */
export interface FallMgmtRecordV13 {
  assessed: number;
  shouldAssess: number;
  occurredPatients: number;
  inpatientTotal: number;
  gradedCompliant: number;
  fallTotal: number;
}

/**
 * 跌倒风险评估率（纯函数）：评估患者数/应评估患者总数×100，保留 2 位小数。
 *
 * @param records 跌倒管理记录列表
 * @returns 跌倒风险评估率百分比
 */
export function computeFallRiskAssessmentRateV13(records: FallMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssess, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 跌倒发生率（纯函数，反向指标，值越低越好）：发生跌倒患者数/住院患者总数×100，保留 2 位小数。
 *
 * @param records 跌倒管理记录列表
 * @returns 跌倒发生率百分比
 */
export function computeFallOccurrenceRateV13(records: FallMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.inpatientTotal, 0);
  if (total === 0) return 0;
  const occurred = records.reduce((acc, r) => acc + r.occurredPatients, 0);
  return Math.round((occurred / total) * 10000) / 100;
}

/**
 * 跌倒伤害分级率（纯函数）：分级合规例数/跌倒例数×100，保留 2 位小数。
 *
 * @param records 跌倒管理记录列表
 * @returns 跌倒伤害分级率百分比
 */
export function computeFallInjuryGradeRateV13(records: FallMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.fallTotal, 0);
  if (total === 0) return 0;
  const graded = records.reduce((acc, r) => acc + r.gradedCompliant, 0);
  return Math.round((graded / total) * 10000) / 100;
}
