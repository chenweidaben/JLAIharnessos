/**
 * 健澜科技 jlmedaios - 管路滑脱风险管理 V13 纯函数（M439-D，M439 收官，患者安全与医疗风险管理组）
 *
 * computeTubeDislodgementRateV13 / computeTubeDislodgementHighRiskAssessmentRateV13 / computeTubeDislodgementReportingRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 管路滑脱风险管理记录 */
export interface TubeDislodgementRecordV13 {
  dislodgedTubes: number;
  totalTubeDays: number;
  assessedHighRisk: number;
  shouldAssess: number;
  reportedDislodgement: number;
  totalDislodgement: number;
}

/**
 * 管路滑脱率（纯函数，千分率‰，反向指标，越低越好）：滑脱管路数/管路总使用日数×1000，保留 2 位小数。
 *
 * @param records 管路滑脱风险管理记录列表
 * @returns 管路滑脱率（‰）
 */
export function computeTubeDislodgementRateV13(records: TubeDislodgementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalTubeDays, 0);
  if (total === 0) return 0;
  const dislodged = records.reduce((acc, r) => acc + r.dislodgedTubes, 0);
  return Math.round((dislodged / total) * 100000) / 100;
}

/**
 * 高危管路评估率（纯函数）：已评估高危管路数/应评估高危管路总数×100，保留 2 位小数。
 *
 * @param records 管路滑脱风险管理记录列表
 * @returns 高危管路评估率百分比
 */
export function computeTubeDislodgementHighRiskAssessmentRateV13(records: TubeDislodgementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldAssess, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessedHighRisk, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 滑脱上报率（纯函数）：已上报滑脱数/滑脱发生总数×100，保留 2 位小数。
 *
 * @param records 管路滑脱风险管理记录列表
 * @returns 滑脱上报率百分比
 */
export function computeTubeDislodgementReportingRateV13(records: TubeDislodgementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDislodgement, 0);
  if (total === 0) return 0;
  const reported = records.reduce((acc, r) => acc + r.reportedDislodgement, 0);
  return Math.round((reported / total) * 10000) / 100;
}
