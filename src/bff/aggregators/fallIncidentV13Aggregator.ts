/**
 * 健澜科技 jlmedaios - 跌倒坠床风险管理 V13 纯函数（M439-B，患者安全与医疗风险管理组）
 *
 * computeFallIncidentRateV13 / computeFallIncidentHighRiskAssessmentRateV13 / computeFallIncidentInjuryClassificationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 跌倒坠床风险管理记录 */
export interface FallIncidentRecordV13 {
  fallCount: number;
  totalBedDays: number;
  assessedHighRisk: number;
  shouldAssess: number;
  classifiedInjury: number;
  totalFall: number;
}

/**
 * 跌倒发生率（纯函数，千分率‰，反向指标，越低越好）：发生跌倒例数/住院总床日数×1000，保留 2 位小数。
 *
 * @param records 跌倒坠床风险管理记录列表
 * @returns 跌倒发生率（‰）
 */
export function computeFallIncidentRateV13(records: FallIncidentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalBedDays, 0);
  if (total === 0) return 0;
  const falls = records.reduce((acc, r) => acc + r.fallCount, 0);
  return Math.round((falls / total) * 100000) / 100;
}

/**
 * 高危评估率（纯函数）：已评估高危患者数/应评估高危患者总数×100，保留 2 位小数。
 *
 * @param records 跌倒坠床风险管理记录列表
 * @returns 高危评估率百分比
 */
export function computeFallIncidentHighRiskAssessmentRateV13(records: FallIncidentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssess, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessedHighRisk, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 跌倒伤害分级率（纯函数）：已分级伤害例数/跌倒总例数×100，保留 2 位小数。
 *
 * @param records 跌倒坠床风险管理记录列表
 * @returns 跌倒伤害分级率百分比
 */
export function computeFallIncidentInjuryClassificationRateV13(records: FallIncidentRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalFall, 0);
  if (total === 0) return 0;
  const classified = records.reduce((acc, r) => acc + r.classifiedInjury, 0);
  return Math.round((classified / total) * 10000) / 100;
}
