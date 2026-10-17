/**
 * 健澜科技 jlmedaios - 康复医学 V13 纯函数（M350-B，stats 避让已有 rehabilitationV5/report-v2）
 *
 * computeAssessmentCountV13 / computeTherapySessionsV13 / computeFunctionalImprovementRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 康复医学记录 */
export interface RehabilitationRecordV13 {
  assessmentCount: number;
  therapySessions: number;
  improvedCount: number;
}

/**
 * 康复评定数（纯函数）：求和。
 *
 * @param records 康复医学记录列表
 * @returns 康复评定数
 */
export function computeAssessmentCountV13(records: RehabilitationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.assessmentCount, 0);
}

/**
 * 康复治疗人次（纯函数）：求和。
 *
 * @param records 康复医学记录列表
 * @returns 康复治疗人次
 */
export function computeTherapySessionsV13(records: RehabilitationRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.therapySessions, 0);
}

/**
 * 功能改善率（纯函数）：改善数/治疗数×100，保留 2 位小数。
 *
 * @param records 康复医学记录列表
 * @returns 功能改善率百分比
 */
export function computeFunctionalImprovementRateV13(records: RehabilitationRecordV13[]): number {
  const improved = records.reduce((acc, r) => acc + r.improvedCount, 0);
  const therapy = records.reduce((acc, r) => acc + r.therapySessions, 0);
  if (therapy === 0) return 0;
  return Math.round((improved / therapy) * 10000) / 100;
}
